import type { ChatWithMessages } from "@/contracts";
import { conversation } from "@/examples/build";

/**
 * The example conversations, in full.
 *
 * Imported ONLY by the examples route. The sidebar takes its titles from `titles.ts` instead, so
 * this file is downloaded by someone who opens an example and by nobody else.
 */
const swissCityPoster = conversation({
  id: "swiss-city-poster",
  title: "Swiss-style city poster",
  hoursAgo: 2,
  favorite: true,
  turns: [
    {
      ask: "Create a premium 4:5 vertical poster in Swiss International Typographic Style — ultra-photorealistic, with massive architectural city-name typography and the skyline peeking through the letters like part of the grid itself. Museum-grade layout, disciplined colour, subtle film-print texture.",
      agent: {
        thinking:
          "Swiss International means a strict grid and very few colours, so the two things that decide the whole composition are which city the type spells and how much colour is allowed against the black and white. Neither is in the brief. Asking costs nothing; guessing costs a render and probably a second one.",
        reply:
          "Before I spend anything, two things would change the entire layout.\n\nWhich city the typography is built around — the letterforms have to carry the skyline inside their counters, so a short name and a long one are different posters, not the same poster with different text.\n\nAnd how much colour you want against the black and white. In this style restraint is the whole effect; one accent reads as deliberate, two starts to look like decoration.",
      },
    },
    {
      ask: "New York, and keep it to one accent — red.",
      agent: {
        thinking:
          "New York is short and vertical-friendly, which suits the 4:5 frame. One red accent means the colour has to do very little and be placed precisely — a block and a rule, not a wash.",
        lead: "Locking the grid to New York and keeping the accent to a single red.",
        steps: [
          "Set the frame to 4:5 at high quality",
          "Locked the palette to black, white and one red",
          "Checked the skyline reads through the letter counters",
        ],
        generations: [
          {
            prompt:
              "Swiss International Typographic Style poster, NEW YORK in monumental grotesk, skyline visible through the counters of the letterforms, single red accent, film-print texture, museum-grade grid",
            image: "poster",
            credits: 0.234,
            seconds: 62,
          },
        ],
        reply:
          "Here it is. The skyline sits *inside* the counters of the letterforms rather than behind them, so the type and the photograph read as one plate instead of an image with words on top.\n\nThe red is doing very little on purpose — one block top-right, one rule under the masthead. In this style the restraint is the point; add a second accent and the grid stops holding the composition together.\n\nThe film-print texture is at about 15%, enough to take the digital edge off without reading as a filter.",
        feedback: "like",
      },
    },
    {
      ask: "Love it. The type feels slightly too tight at the top though — can you give it more air?",
      agent: {
        thinking:
          "Margins, not composition. This is an edit of the existing plate — regenerating would move the skyline and the crop as well, and cost the same as the original for a change that only affects one edge.",
        lead: "Editing the plate rather than re-rendering it, so nothing else moves.",
        steps: [
          "Increased the top margin to a full grid unit",
          "Kept the baseline grid and the skyline registration",
          "Left the red placement untouched",
        ],
        generations: [
          {
            prompt:
              "Same poster, increased top margin by one grid unit, everything else unchanged",
            image: "poster",
            credits: 0.161,
            seconds: 48,
            edit: true,
          },
        ],
        reply:
          "More air at the top, and nothing else has moved.\n\nI edited the existing plate instead of generating a new one — that keeps the skyline registration, the crop and the red exactly where you approved them. A fresh render would have given you a different photograph that happened to have a bigger margin.\n\nIt's also about a third cheaper than the original, which is generally true of edits: most of the frame is already there.",
        feedback: "like",
      },
    },
    {
      ask: "What would this cost if I wanted the whole set — say five cities?",
      agent: {
        reply:
          "Four more at this size and quality, so roughly 0.94 on top of what you've already spent.\n\nWorth knowing: if the five are going to hang together as a set, it's cheaper and more consistent to settle the grid on one and then run the rest against it, rather than generating five and reconciling them afterwards. You've effectively already done that step.\n\nIf you want them, tell me the four cities and I'll draw up a plan first so you can see the cost before any of it runs.",
      },
    },
  ],
});

const threePosterCampaign = conversation({
  id: "three-poster-campaign",
  title: "Three-poster campaign",
  hoursAgo: 6,
  turns: [
    {
      ask: "I need three posters for a streetwear drop — same brand, different moods. One clean studio shot, one street editorial, one lifestyle grid. Plan it out before you spend anything.",
      agent: {
        thinking:
          "Three generations, so this is a plan rather than a single call. The three moods are already named, which is most of the brief. What is missing is whether they have to read as one set — that decides whether the second and third inherit the first's lighting or get their own.",
        reply:
          "Three renders, so let me price it before any of it runs.\n\nThe order matters more than it looks. If I do the studio shot first it sets the palette and the key direction, and the other two can be shot to match — which is what makes three images read as one campaign rather than three photographs of the same product.\n\nSo: studio, then street, then the grid. Roughly 0.06 each, a little under 0.18 for the set. Approve and I'll run them one at a time so you can stop if the first one is wrong.",
      },
    },
    {
      ask: "Approved. Go one at a time.",
      agent: {
        lead: "Starting with the studio plate, since it sets what the other two match.",
        steps: [
          "Set the frame to 4:5 at high quality",
          "Grey seamless, single key from the left",
          "Product centred on the vertical axis",
        ],
        generations: [
          {
            prompt:
              "Clean studio product poster, grey seamless backdrop, single key light from the left, streetwear piece centred, high fashion editorial quality",
            image: "cgi",
            credits: 0.0588,
            seconds: 44,
          },
        ],
        reply:
          "Studio one first, since it sets the palette the other two have to match.\n\nGrey seamless, single key from the left, product dead centre. Deliberately flat — this is the frame the other two get to react against, so it shouldn't be the interesting one.\n\nSay the word and I'll run the street editorial next, matched to this key direction.",
        feedback: "like",
      },
    },
    {
      ask: "Actually the studio one is too cold. Warm the light and keep everything else.",
      agent: {
        thinking:
          "An edit, not a regeneration. The composition is right and only the colour temperature is wrong — re-running the prompt would move the pose and the crop too, and cost the same as the original.",
        lead: "Warming the key and leaving the composition alone.",
        steps: [
          "Shifted the key temperature warmer",
          "Kept the pose, crop and product placement",
          "Carried the new temperature into the remaining steps",
        ],
        generations: [
          {
            prompt: "Same studio plate, warmer key light, everything else unchanged",
            image: "cgi",
            credits: 0.041,
            seconds: 38,
            edit: true,
          },
        ],
        reply:
          "Warmed it and left everything else exactly as it was.\n\nI edited the existing plate rather than regenerating, so the pose, the crop and the product placement are what you approved — only the light has moved. A fresh render would have handed you a different photograph that happened to be warmer.\n\nIt also keeps the palette decision intact for the two still to come: they'll now inherit the warmer key rather than the original one.",
        feedback: "like",
      },
    },
    {
      ask: "Much better. Street editorial next.",
      agent: {
        lead: "Matching the street shot to the warmer key.",
        steps: [
          "Kept the key direction from the studio plate",
          "Carried the warmer temperature across",
          "Let the location do the work of the contrast",
        ],
        generations: [
          {
            prompt:
              "Japanese streetwear editorial poster, warm key light from the left matching a studio plate, urban location, high fashion editorial quality",
            image: "streetwear",
            credits: 0.0588,
            seconds: 51,
          },
        ],
        reply:
          "Street one is up, shot to match rather than to contrast.\n\nSame key direction and the same warm temperature as the studio plate, so the two read as one campaign photographed on two days rather than two campaigns. The location does all the work of making it feel different — the lighting deliberately doesn't.\n\nOne step left.",
      },
    },
    {
      ask: "Go on, finish it.",
      agent: {
        lead: "Last step — the lifestyle grid.",
        steps: [
          "Nine frames on the campaign palette",
          "Checked each frame reads on its own",
          "Marked the plan complete",
        ],
        generations: [
          {
            prompt:
              "Nine-pose lifestyle photo collage, warm campaign palette, streetwear, each frame legible in isolation",
            image: "collage",
            credits: 0.0588,
            seconds: 57,
          },
        ],
        reply:
          "That's the plan finished.\n\nThe grid reuses the campaign palette across nine frames so it sits beside the other two rather than competing with them. It's the piece that gets cut up for feeds, so each frame has to survive being seen on its own — that's why the poses vary more than the lighting does.\n\nThree renders and one edit. Everything came in on the estimate.",
        feedback: "like",
      },
    },
    {
      ask: "Can I get the studio one in portrait too?",
      agent: {
        reply:
          "Yes — and that's a crop rather than a render, so it's a fraction of the cost.\n\nTell me which way you'd rather lose the edge: centred keeps the product where it is and trims both sides evenly, or I can weight it left and keep more of the negative space on the right, which usually sits better under a headline.",
      },
    },
  ],
});

const whatCanYouDo = conversation({
  id: "what-can-you-do",
  title: "What can you do?",
  hoursAgo: 30,
  turns: [
    {
      ask: "What can you actually do?",
      agent: {
        reply:
          "I make things rather than describe them. Images from a description, edits to images that already exist, crops, and joining video clips together.\n\nWhat I can't do is browse the web, run code, or read a file you haven't given me. If something needs one of those, I'll say so rather than improvise around it.\n\nThe useful part is what happens before any of that. Tell me what the thing is *for* — a poster, a thumbnail, a product shot — and I'll ask about the couple of decisions that actually change the output, rather than guessing and charging you for the guess.",
      },
    },
    {
      ask: "What does it cost?",
      agent: {
        reply:
          "Only what gets generated. An image is a few hundredths of a credit at standard quality, a crop is less than that, and video is the expensive one.\n\nEverything around it is free — asking you questions, drawing up a plan, thinking about the brief, changing my mind. That's deliberate rather than generous: it's much cheaper for both of us if I understand what you want before I render it.\n\nA failed tool is refunded in full, including the hold taken when the turn started.",
      },
    },
    {
      ask: "What happens if you get it wrong?",
      agent: {
        reply:
          "Tell me what's wrong rather than asking again from scratch.\n\nIf the composition is right and only one thing is off — the light, the margin, a colour — that's an edit, and an edit keeps everything that already worked. It's cheaper than a fresh render and, more importantly, it doesn't move the parts you liked.\n\nIf the whole thing missed, say that instead and I'll start over. The distinction matters more than it sounds: regenerating a nearly-right image usually gives you a different nearly-right image.",
      },
    },
    {
      ask: "Can you plan something out before running it?",
      agent: {
        reply:
          "Yes, and I will by default once something needs more than one billable step.\n\nYou get the steps in order, each naming the tool it will use and what it's estimated to cost, before any of it runs. You can approve the lot, or run it a step at a time so you can stop after the first one if it's heading the wrong way.\n\nI don't price anything myself — the figures come from the system, so a number you see is one I can't have invented.",
      },
    },
    {
      ask: "What's the thing people usually get wrong?",
      agent: {
        reply:
          "Describing the picture instead of the purpose.\n\n\"A blue poster with big text\" gives me pixels to fill. \"A poster for a record shop opening, seen from across the street\" tells me the type has to be readable at distance, the palette should survive bad printing, and the detail belongs in the middle third. Same request, very different output.\n\nThe other one is naming real people. That gets refused by the provider every time — describe them instead and you keep the composition you wanted.",
      },
    },
  ],
});

const BY_ID: Record<string, ChatWithMessages> = {
  "swiss-city-poster": swissCityPoster,
  "three-poster-campaign": threePosterCampaign,
  "what-can-you-do": whatCanYouDo,
};

export const exampleChat = (id: string): ChatWithMessages | undefined => BY_ID[id];
