const $ = (selector) => document.querySelector(selector);
const utf8 = new TextDecoder();
const invalid = 0xffffffff;
let wasm;
let people = [];
let properties = [];
let selectedPerson = -1;

function readString(pointer, length) {
  return utf8.decode(new Uint8Array(wasm.memory.buffer, pointer, length));
}

function nameAt(index) {
  return readString(wasm.person_name_ptr(index), wasm.person_name_len(index));
}

function phraseAt(index) {
  return readString(wasm.property_name_ptr(index), wasm.property_name_len(index));
}

function makePortrait(index, className = "") {
  const image = document.createElement("img");
  image.src = `../assets/portraits/person-${String(index).padStart(2, "0")}.svg`;
  image.alt = `${people[index].name}'s illustrated portrait`;
  image.loading = "lazy";
  image.className = className;
  return image;
}

function setConnection(text, ready = false) {
  $("#connection-status").textContent = text;
  $(".status-dot").style.background = ready ? "var(--mint)" : "var(--accent)";
}

function renderSecret() {
  const index = wasm.game_human_target();
  const card = $("#secret-card");
  card.replaceChildren();
  card.append(makePortrait(index));
  const details = document.createElement("div");
  const title = document.createElement("div");
  title.className = "secret-name";
  title.textContent = people[index].name;
  const caption = document.createElement("div");
  caption.className = "secret-caption";
  caption.textContent = "Your secret person";
  const badge = document.createElement("span");
  badge.className = "secret-badge";
  badge.textContent = "KEEP IT SECRET";
  details.append(title, caption, badge);
  card.append(details);
}

function renderQuestions() {
  const root = $("#questions");
  root.replaceChildren();
  const usable = properties.filter((_, index) => wasm.game_can_ask(index) !== 0).length;
  $("#question-count").textContent = usable;
  properties.forEach((phrase, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "question-button";
    button.textContent = phrase[0].toUpperCase() + phrase.slice(1);
    button.disabled = wasm.game_can_ask(index) === 0 || wasm.game_winner() !== 0;
    button.title = button.disabled ? "This trait does not split the remaining candidates" : `Ask: Does your person ${phrase}?`;
    button.addEventListener("click", () => askQuestion(index));
    root.append(button);
  });
  $("#question-note").textContent = usable === 0
    ? "No useful questions remain on this board."
    : `${usable} question${usable === 1 ? "" : "s"} can still split your candidates.`;
}

function renderPeople() {
  const root = $("#people-grid");
  const candidateMask = wasm.game_candidates_mask();
  root.replaceChildren();
  people.forEach((person, index) => {
    const active = (candidateMask & (1 << index)) !== 0;
    const card = document.createElement("button");
    card.type = "button";
    card.className = `person-card${active ? "" : " eliminated"}${selectedPerson === index && active ? " selected" : ""}`;
    card.disabled = !active || wasm.game_winner() !== 0;
    card.setAttribute("aria-pressed", String(selectedPerson === index));
    card.setAttribute("aria-label", `${person.name}${active ? ", still possible" : ", eliminated"}`);
    if (!active) {
      const stamp = document.createElement("span");
      stamp.className = "eliminated-stamp";
      stamp.textContent = "CROSSED OFF";
      card.append(stamp);
    }
    card.append(makePortrait(index));
    const name = document.createElement("span");
    name.className = "person-name";
    name.textContent = person.name;
    card.append(name);
    const tags = document.createElement("span");
    tags.className = "trait-tags";
    let count = 0;
    person.traits.forEach((hasTrait, traitIndex) => {
      if (hasTrait && count < 3) {
        const tag = document.createElement("span");
        tag.className = "trait-tag";
        tag.textContent = properties[traitIndex];
        tags.append(tag);
        count += 1;
      }
    });
    card.append(tags);
    card.addEventListener("click", () => {
      selectedPerson = selectedPerson === index ? -1 : index;
      renderPeople();
      $("#board-subtitle").textContent = selectedPerson === -1
        ? "Find the bot's secret person."
        : `${people[selectedPerson].name} is still a possible answer.`;
    });
    root.append(card);
  });
  $("#remaining-count").textContent = wasm.game_candidate_count();
}

function logLine(actor, property, answer, eliminated) {
  const article = document.createElement("div");
  article.className = "log-entry";
  const heading = document.createElement("div");
  heading.className = "log-title";
  heading.textContent = actor;
  const answerTag = document.createElement("span");
  answerTag.className = `log-answer ${answer ? "yes" : "no"}`;
  answerTag.textContent = answer ? "YES" : "NO";
  heading.append(answerTag);
  const detail = document.createElement("div");
  detail.className = "log-detail";
  detail.textContent = `Does your person ${properties[property]}? ${eliminated} candidate${eliminated === 1 ? "" : "s"} crossed off.`;
  article.append(heading, detail);
  return article;
}

function renderLog() {
  const root = $("#round-log");
  const humanQuestion = wasm.game_last_human_question();
  const botQuestion = wasm.game_last_bot_question();
  if (humanQuestion === invalid && botQuestion === invalid) {
    root.innerHTML = '<p class="log-empty">No questions yet. Make the first move.</p>';
    return;
  }
  root.replaceChildren();
  if (humanQuestion !== invalid) {
    root.append(logLine("YOU ASKED", humanQuestion, wasm.game_last_human_answer() !== 0, wasm.game_last_human_eliminated()));
  }
  if (botQuestion !== invalid) {
    root.append(logLine("BOT ASKED ABOUT YOUR PERSON", botQuestion, wasm.game_last_bot_answer() !== 0, wasm.game_last_bot_eliminated()));
  }
}

function renderResult() {
  const winner = wasm.game_winner();
  const banner = $("#result-banner");
  banner.hidden = winner === 0;
  if (winner === 0) return;
  banner.className = `result-banner${winner === 2 ? " loss" : ""}`;
  const title = winner === 1 ? "You got there first! ✦" : "The bot got there first.";
  const copy = winner === 1
    ? `You narrowed the board to ${people[trailingIndex(wasm.game_candidates_mask())].name} before the bot found yours.`
    : `The bot narrowed your secret person down to ${people[wasm.game_human_target()].name}. Try another round?`;
  banner.replaceChildren();
  const heading = document.createElement("div");
  heading.className = "result-title";
  heading.textContent = title;
  const detail = document.createElement("div");
  detail.className = "result-copy";
  detail.textContent = copy;
  banner.append(heading, detail);
  $("#question-note").textContent = "Round over - start a new game when you're ready.";
  $("#board-subtitle").textContent = winner === 1 ? "You found the secret person." : "The bot found your secret person.";
}

function trailingIndex(mask) {
  for (let index = 0; index < people.length; index += 1) {
    if ((mask & (1 << index)) !== 0) return index;
  }
  return 0;
}

function render() {
  renderQuestions();
  renderPeople();
  renderLog();
  renderResult();
  $("#round-count").textContent = wasm.game_turns();
  $("#new-game").disabled = false;
}

function askQuestion(property) {
  const result = wasm.game_ask(property);
  if (result === 1) {
    $("#question-note").textContent = "That question does not exist.";
    return;
  }
  if (result === 2) {
    $("#question-note").textContent = "That trait no longer splits your remaining people.";
    renderQuestions();
    return;
  }
  selectedPerson = -1;
  render();
  if (result === 6) {
    $("#question-note").textContent = "The bot has no useful question left. Start a fresh round.";
  }
}

function newGame() {
  let seed = (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  if (globalThis.crypto?.getRandomValues) {
    const sample = new Uint32Array(1);
    globalThis.crypto.getRandomValues(sample);
    seed = sample[0];
  }
  wasm.game_new(seed);
  selectedPerson = -1;
  $("#result-banner").hidden = true;
  $("#board-subtitle").textContent = "Find the bot's secret person.";
  renderSecret();
  render();
}

async function start() {
  try {
    const response = await fetch("./game.wasm");
    if (!response.ok) throw new Error("game.wasm was not found");
    const bytes = await response.arrayBuffer();
    const result = await WebAssembly.instantiate(bytes, {});
    wasm = result.instance.exports;
    if (wasm.api_version() !== 1) throw new Error("unexpected WASM API version");
    people = Array.from({ length: wasm.person_count() }, (_, index) => ({
      name: nameAt(index),
      traits: Array.from({ length: wasm.property_count() }, (_, trait) => (wasm.person_traits(index) & (1 << trait)) !== 0),
    }));
    properties = Array.from({ length: wasm.property_count() }, (_, index) => phraseAt(index));
    $("#new-game").addEventListener("click", newGame);
    setConnection("Ready", true);
    newGame();
  } catch (error) {
    setConnection("Build required");
    $("#fatal-error").hidden = false;
    $("#fatal-error").textContent = `The game engine could not start (${error.message}). From the project root, run ./scripts/build.sh and refresh this page.`;
  }
}

start();
