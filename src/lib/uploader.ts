import Uppy from "@uppy/core";
import Transloadit, { type AssemblyResponse } from "@uppy/transloadit";

/** What one finished assembly reports about the file it carried, mapped for `POST /attachments`. */
export type UploadedFile = {
  assemblyId: string;
  url: string;
  contentType: string;
  size: number;
  metadata: Record<string, unknown> | undefined;
};

export type UploadHandle = {
  done: Promise<UploadedFile>;
  cancel: () => void;
};

/**
 * Runs one file through its own signed Transloadit assembly and resolves with the uploaded file.
 *
 * INVARIANT: `assembly.params` is passed on verbatim as the signed string — re-serializing it breaks
 * the signature. Each assembly is signed for exactly one file (`num_expected_upload_files: 1`), so
 * one Uppy instance per file is the contract, not an implementation choice.
 *
 * INVARIANT: the finished file is read from `uploads[]`. A no-steps assembly leaves `results` empty —
 * `results[":original"]` does not exist and must not be read.
 */
export function uploadToAssembly(a: {
  file: File;
  assembly: { params: string; signature: string };
  onProgress?: (percent: number) => void;
}): UploadHandle {
  const uppy = new Uppy({ autoProceed: false, restrictions: { maxNumberOfFiles: 1 } });

  uppy.use(Transloadit, {
    waitForEncoding: true,
    assemblyOptions: { params: a.assembly.params, signature: a.assembly.signature },
  });

  uppy.on("progress", (percent) => a.onProgress?.(percent));

  const done = new Promise<UploadedFile>((resolve, reject) => {
    const fail = (error: unknown) => {
      reject(error instanceof Error ? error : new Error("The upload failed."));
      uppy.destroy();
    };

    uppy.on("transloadit:complete", (assembly: AssemblyResponse) => {
      const uploaded = assembly.uploads?.[0];
      if (!assembly.assembly_id || !uploaded?.ssl_url) {
        fail(new Error("The assembly finished without an uploaded file."));
        return;
      }

      resolve({
        assemblyId: assembly.assembly_id,
        url: uploaded.ssl_url,
        contentType: uploaded.mime ?? a.file.type,
        size: uploaded.size ?? a.file.size,
        metadata: (uploaded.meta as Record<string, unknown> | undefined) ?? undefined,
      });
      uppy.destroy();
    });

    uppy.on("transloadit:assembly-error", (_assembly, error) => fail(error));
    uppy.on("upload-error", (_file, error) => fail(error));
    uppy.on("error", (error) => fail(error));

    uppy.addFile({ name: a.file.name, type: a.file.type, data: a.file });
    uppy.upload().catch(fail);
  });

  // A cancelled upload must not surface as an unhandled rejection after the caller walked away.
  done.catch(() => {});

  return {
    done,
    cancel: () => {
      uppy.cancelAll();
      uppy.destroy();
    },
  };
}
