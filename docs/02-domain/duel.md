# Duel

**Document Version:** 1.0  
**Status:** Draft  
**Last Updated:** September 2026

---

# 1. Purpose

A Duel is two students on the same set of questions, compared.

It comes in two modes. **Asynchronous**: each sits the paper whenever they like
and the result is a comparison once both are done. **Live**: both are on the
clock together, question by question, and see each other's progress as it
happens.

Either way the play itself is the ordinary quiz engine (decision 21). Scoring,
exposure history, XP, statistics and the mistake ladder stay single
implementations, and a duel ends with the same review as any test — including
the explanation for every question. That is what separates it from a quiz show:
you find out why you lost the ones you lost.

---

# 2. Relationships

A Duel:

- has a challenger and an opponent (both Users);
- belongs to one Subject and optionally one Topic;
- freezes its paper as DuelQuestions — one order, shared by both players;
- has at most two QuizSessions of type `DUEL`, one per player.

Public demo accounts (deployment.md §17.9) duel only each other, and never live.

---

# 3. Fields

| Field | Notes |
|-------|-------|
| challengerId, opponentId | For a random live match, the player who waited longer is the challenger |
| subjectId, topicId | Topic is optional; a random live match is always the whole subject |
| mode | `ASYNC` or `LIVE` |
| status | `PENDING` → `ACCEPTED` → `COMPLETED`, or `DECLINED` / `EXPIRED` |
| questionCount | Async: 3–20. Live: 5, 10, 15 or 20 |
| secondsPerQuestion | Live only: 10, 15, 20, 30, 45 or 60. Null for async |
| expiresAt | Async: the invite lifetime (48 h). Live: when the last question closes, with a margin |
| acceptedAt, startedAt, completedAt | `startedAt` is live only: the moment the countdown ended |
| forfeitedById | Live only: the player who surrendered. Their opponent wins whatever the score |

---

# 4. Asynchronous mode

1. The challenger names a username, a subject, optionally a topic, and a count.
   The pool is checked at once — being told the topic is too thin after the
   opponent agreed is worse than being told now.
2. The opponent has 48 hours to accept or decline. The hourly sweep expires the
   rest.
3. On accept the paper is drawn and frozen: questions neither player has met
   lately, reading passages kept whole.
4. Each player starts their half whenever they like; it is an ordinary untimed
   session over the frozen paper.
5. Scores stay hidden until both are done — seeing what you have to beat before
   you play is a target, not a duel.

---

# 5. Live mode

## 5.1 Finding an opponent

- **By username.** The opponent must be online at that moment; they get the
  challenge on whatever page they are on, with 30 seconds to answer. If they are
  offline, decline, or let it lapse, the challenger is offered to send the same
  settings as an asynchronous duel instead.
- **Random opponent.** A queue per subject, seconds per question and question
  count. First come, first matched; no confirmation after a match, so a pair is
  never lost to one slow click. After 90 seconds alone in the queue the player
  is told nobody was found and offered the other two ways.

A player is in at most one of these at a time: waiting in the queue, holding an
open challenge, or playing. Anyone with an unfinished self-study session is
turned away first (the one-active-session rule), with a way back to it.

## 5.2 Questions that fit the clock

A question is offered only if it can honestly be done in the time chosen. Each
question gets an estimate:

- reading time — the prompt and options at 17 characters a second;
- plus a base for the kind of work: single choice 3 s, multiple choice 8 s,
  ordering 10 s, matching 12 s, a numeric answer 20 s;
- plus 8 s for mathematics outside numeric answers — there is still a
  calculation to do;
- times 1.2 for intermediate and 1.5 for advanced difficulty.

It fits if the estimate is at most 80 % of the seconds per question. Questions
tied to a reading passage never fit: the text alone outlasts any budget here.
Questions with an image need at least 20 seconds.

The set-up screen asks how many questions fit each time for the chosen subject
and topic, and switches off the combinations that cannot be filled — at the
time of writing, no mathematics question fits 10 seconds.

The coefficients are a first estimate: nobody had timed answers before live
duels existed. Live answers are timed by the server, so they are the data to
correct them from.

## 5.3 A game

`countdown (3 s) → question 1 → reveal (3 s) → question 2 → … → result`

- The server keeps the only clock. Each question is sent when it opens, without
  its key, with an absolute deadline; clients show a countdown corrected for
  their clock offset.
- One answer per question, and the first one stands. It counts if it arrives
  before the deadline plus one second for the network. The time spent is
  measured by the server.
- While a question is open, each player sees only whether the other has
  answered — never whether they were right.
- When both have answered the reveal starts at once; nobody waits out a clock
  that no longer matters.
- The reveal shows the key, who was right and how fast, and the running score.
- At the end both sessions are completed through the engine, so XP, exposure
  history and the mistake ladder behave as after any test.

## 5.4 Who wins

Accuracy decides; at equal accuracy the shorter total time wins — the same rule
as asynchronous duels. A player who surrenders loses whatever the score.

## 5.5 Disconnects

- The game does not pause. A disconnected player's questions close unanswered.
  The other player sees that the connection was lost.
- A player who comes back — another tab, the same tab after a network drop —
  gets the game's current state and plays on.
- If the server itself restarts, the game in memory is gone, but nothing hangs:
  both sessions carry an expiry, the engine closes them lazily, and the duel
  settles the next time anyone looks.

---

# 6. What is deliberately not here

- **Changing an answer in a live game.** The first answer stands; being fast is
  part of the game and a changeable answer makes it meaningless.
- **Choosing a topic for a random match.** The queue would split into pieces too
  small to ever pair anybody.
- **A rating.** Wins and losses are not ranked. A rating asks for a volume of
  games the platform does not have yet.
- **Live duels in the demo.** Two demo accounts cannot be online at once in any
  useful way; the demo shows asynchronous duels.
