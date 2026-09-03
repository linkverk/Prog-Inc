import type { Rank } from "../core/types";

/** The shared ladder. A specialisation renames rungs 3 and up; the thresholds never move. */
export const RANKS: Rank[] = [
  { name: "Curious Beginner", req: 0, note: "You opened an editor. That is the whole job so far." },
  { name: "Hobbyist", req: 400, note: "Weekend projects nobody asked for." },
  { name: "Bootcamp Student", req: 4e3, note: "Twelve weeks, one very tired brain." },
  { name: "Intern", req: 2.5e4, note: "Your first ticket is a typo in a footer." },
  { name: "Junior Developer", req: 1.5e5, note: "You are trusted with real branches now." },
  { name: "Developer", req: 1.2e6, note: "You ship work end to end, alone." },
  { name: "Senior Developer", req: 1e7, note: "People ask you before they start writing." },
  { name: "Staff Engineer", req: 9e7, note: "Your scope is the system, not the ticket." },
  { name: "Tech Lead", req: 1.6e9, note: "You multiply a team instead of a keyboard." },
  { name: "Principal Engineer", req: 1.4e10, note: "You write the documents everyone else implements." },
  { name: "Distinguished Eng.", req: 1.2e11, note: "The org reorganises around your designs." },
  { name: "Chief Technology Officer", req: 1e12, note: "Strategy, and still a terminal open." },
  { name: "Open Source Legend", req: 9e12, note: "Millions of machines run something you wrote." },
  { name: "Compiler Architect", req: 8e13, note: "You build the tools the tool-builders use." },
  { name: "The 10x Engineer", req: 7e14, note: "The myth, measured and confirmed." },
  { name: "Turing Award Laureate", req: 6e15, note: "A field remembers your name." },
];

/** The rank at which you choose a specialisation. */
export const PICK_RANK = 3;
