/* =====================================================================
   YOUR STORY  ·  LA TUA STORIA

   This is the file you edit to change the story. The page builds
   itself from the lists below, top to bottom.
   (The opening quote and the about/contact text at the end are in
   index.html. So is the title Google and share previews show: if you
   rename the story, change it there too.)

   WHO IS WRITING
     PHONE_SENDER     the name on Christine's phone, in the story. She
                      doesn't know who they are, so it stays "Unknown number".
     TAKEOVER_SENDER  the name the scrambled letters turn into at the end,
                      when the page gets hacked: the reveal of who has been
                      talking all along.
                      mark   the small sign in the round picture next to the
                             name (on Christine's phone it is a "?")
                      it     (optional) a small Italian line under the name;
                             leave it as "" to show nothing

   THE STORY
     id           a short name for the story's link, e.g. "point-one"
     title        the title shown big on the title card
     subtitle     (optional) a small line under the title, e.g. the Italian.
                  Leave it as "" to show nothing.
     frames       the background pictures of the story.
                  id        a short name you choose, e.g. "I-1"
                  image     the picture file (square pictures work best)
                  focus     which part of the picture to keep when it is
                            cropped: "left-right% top-bottom%".
                            "50% 50%" = the centre. Phones show a tall
                            slice, computers a wide slice.
                  exposure  (optional) brighten a dark picture, e.g. 1.3,
                            or darken a bright one, e.g. 0.7
                  alt       a short description of the picture
     lines        the story, one line per scroll.
                  en / it   the English line and its Italian translation
                  frame     (optional) switch the background to this frame
                            when this line appears. "hero" = the opening
                            picture.
                  dim       (optional) darken the picture under this line
                            and the ones after it: 0 = full picture,
                            0.5 = half dark, 0.8 = very faint. Write
                            dim: 0 to go back to the full picture.
                  rain      (optional) change the rain from this line on:
                            "steady", "storm", "thin" or "none"
                  The LAST plain line is the cliffhanger: it is shown
                  larger, in italics, and held on screen longer.
                  The title card always shows the opening picture.

   A PHONE CONVERSATION (inside the lines)
     { phone: "start" }
                  the narrator's phone buzzes: a notification slides down,
                  then the screen becomes the conversation. The rain stops
                  and the screen turns bright until the phone section ends.
     { type: "message", from: "them", en: "...", it: "..." }
                  a message from the sender. A short "typing…" shows first.
     { type: "message", from: "me", typed: true, en: "...", it: "..." }
                  a message from the narrator. With typed: true it is typed
                  out letter by letter in the input box, then sent.
                  Without it, it simply appears.
     { phone: "end" }
                  back to the dark pictures. The next line should name its
                  frame, e.g. frame: "II-3".
     Each message is one scroll, like a line.

   THE ENDING (after the story)
     TAKEOVER     after the cliffhanger the page "gets hacked" and
                  TAKEOVER_SENDER writes to the reader.
       messages   the first one arrives with the glitch, then one per
                  scroll, same as above ("them" or "me")
       button     the button under the last message: its words and
                  where it goes
       hint       the broken "scroll down" line under the button, which
                  leads out of the hack to the closing screen

   TO ADD A LINE
     Copy one line  { en: "...", it: "..." },  and change the words.
     Keep the quotes "..." around every piece of text. If your text
     needs quotation marks, use the curly ones “ ” or « ».

   PICTURES
     Frames live in images/frames/sunday-went-fine/ (the folder kept its old
     name; the paths below point to it). Replace a picture by
     saving yours with the same file name, or change the name here.
     Spare frames for later are in images/frames/sunday-went-fine/unused/.
     Tip: add ?slots to the end of the address to see every image slot
     labelled on the page.
   ===================================================================== */

var PHONE_SENDER = { en: "Unknown number", it: "Numero sconosciuto" };
var TAKEOVER_SENDER = { en: "POINT ONE", it: "", mark: ".1" };

window.STORIES = [

  {
    id: "point-one",
    title: "POINT ONE",
    subtitle: "",

    frames: [
      { id: "I-1",  image: "images/frames/sunday-went-fine/I-1.webp",  focus: "50% 62%", exposure: 0.7, alt: "A lone figure on a rooftop in the rain, a red light far away" },
      { id: "I-2",  image: "images/frames/sunday-went-fine/I-2.webp",  focus: "50% 50%", exposure: 1.2, alt: "Looking straight down into a dark street, a red light in a puddle" },
      { id: "II-3", image: "images/frames/sunday-went-fine/II-3.webp", focus: "50% 60%", alt: "A figure, black against a wall of crimson fire" }
    ],

    lines: [
      { frame: "I-1", rain: "steady",
        en: "My sister’s birthday. I called her. She didn’t pick up.",
        it: "Il compleanno di mia sorella. L’ho chiamata. Non ha risposto." },
      { en: "Nobody had seen her in months. Nobody had looked.",
        it: "Nessuno la vedeva da mesi. Nessuno l’aveva cercata." },
      { en: "The police closed the case in a week.",
        it: "La polizia ha chiuso il caso in una settimana." },

      { frame: "hero", dim: 0.5,
        en: "So I bought help. An Eden android, like everyone has.",
        it: "Così ho comprato un aiuto. Un androide Eden, come ce l’hanno tutti." },
      { en: "One night I asked it to hold me like someone who loved me.",
        it: "Una notte gli ho chiesto di abbracciarmi come qualcuno che mi voleva bene." },
      { en: "It held me exactly the way she used to.",
        it: "Mi ha abbracciata esattamente come faceva lei." },
      { en: "I asked where it had learned that. It didn’t know.",
        it: "Gli ho chiesto dove l’avesse imparato. Non lo sapeva." },

      { frame: "I-2", dim: 0,
        en: "I went back to the police. The next day, a message: stop digging.",
        it: "Sono tornata dalla polizia. Il giorno dopo, un messaggio: smetti di scavare." },
      { en: "Then someone asked to meet me. Saturday, nine o’clock.",
        it: "Poi qualcuno mi ha chiesto un incontro. Sabato, alle nove." },
      { en: "I was halfway there when my phone buzzed.",
        it: "Ero a metà strada quando il telefono ha vibrato." },

      { phone: "start" },
      { type: "message", from: "them",
        en: "Don’t react.",
        it: "Non reagire." },
      { type: "message", from: "them",
        en: "Take the first left.",
        it: "Prendi la prima a sinistra." },
      { type: "message", from: "them",
        en: "If you reach the meeting point, you’ll die.",
        it: "Se arrivi al punto d’incontro, muori." },
      { type: "message", from: "them",
        en: "They read everything you type. Send this, word for word:",
        it: "Leggono tutto quello che scrivi. Manda questo, parola per parola:" },
      { type: "message", from: "them",
        en: "“Sunday went fine, the lake was beautiful.”",
        it: "«Domenica è andata bene, il lago era bellissimo.»" },
      { type: "message", from: "me", typed: true,
        en: "Sunday went fine, the lake was beautiful.",
        it: "Domenica è andata bene, il lago era bellissimo." },
      { type: "message", from: "them",
        en: "Good. Keep walking. Don’t look up at the cameras.",
        it: "Brava. Continua a camminare. Non alzare lo sguardo verso le telecamere." },
      { type: "message", from: "me", typed: true,
        en: "Who are you?",
        it: "Chi sei?" },
      { type: "message", from: "them",
        en: "Someone who believes you.",
        it: "Qualcuno che ti crede." },
      { phone: "end" },

      { frame: "II-3", rain: "steady",
        en: "Three streets back, a car stopped exactly where I should have been.",
        it: "Tre strade più indietro, un’auto si è fermata proprio dove sarei dovuta essere." }
    ]
  }

];

window.TAKEOVER = {
  messages: [
    { from: "them", en: "You read her story.", it: "Hai letto la sua storia." },
    { from: "them", en: "Now you know about Eden.", it: "Ora sai di Eden." },
    { from: "them", en: "So do they.", it: "Lo sanno anche loro." }
  ],
  button: {
    en: "Follow for the next chapter",
    it: "Seguimi per il prossimo capitolo",
    href: "https://www.instagram.com/rumxno.angelo/"
  },
  hint: { en: "scr0ll d0wn", it: "sc0rri g1ù" }
};
