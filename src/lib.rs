#![allow(static_mut_refs)]

mod data;

use data::{useful_question, yes_mask, ALL_CANDIDATES, INVALID, PEOPLE, PROPERTY_PHRASES};

struct Game {
    target: u32,
    candidates: u32,
    winner: u32,
    last_question: u32,
    last_answer: u32,
    last_eliminated: u32,
    turns: u32,
}

impl Game {
    const fn empty() -> Self {
        Self { target: 0, candidates: 0, winner: 0, last_question: INVALID, last_answer: 0, last_eliminated: 0, turns: 0 }
    }

    fn new(seed: u32) -> Self {
        let mut game = Self::empty();
        game.target = if seed == 0 { 7 } else { seed % PEOPLE.len() as u32 };
        game.candidates = ALL_CANDIDATES;
        game
    }

    fn can_ask(&self, property: u32) -> bool {
        self.winner == 0 && useful_question(self.candidates, property)
    }

    fn ask(&mut self, property: u32) -> u32 {
        if self.candidates.count_ones() == 1 {
            self.winner = 1;
            return 3;
        }
        if property as usize >= PROPERTY_PHRASES.len() { return 1; }
        if !self.can_ask(property) { return 2; }
        let previous = self.candidates;
        let answer = (PEOPLE[self.target as usize].traits & (1 << property) != 0) as u32;
        let yes = yes_mask(property);
        self.candidates = if answer == 1 { previous & yes } else { previous & !yes };
        self.last_question = property;
        self.last_answer = answer;
        self.last_eliminated = previous.count_ones() - self.candidates.count_ones();
        self.turns += 1;
        if self.candidates.count_ones() == 1 {
            self.winner = 1;
            3
        } else {
            0
        }
    }
}

static mut STATE: Game = Game::empty();

fn state_mut() -> &'static mut Game {
    unsafe { &mut *std::ptr::addr_of_mut!(STATE) }
}

#[no_mangle]
pub extern "C" fn api_version() -> u32 { 1 }
#[no_mangle]
pub extern "C" fn person_count() -> u32 { PEOPLE.len() as u32 }
#[no_mangle]
pub extern "C" fn property_count() -> u32 { PROPERTY_PHRASES.len() as u32 }
#[no_mangle]
pub extern "C" fn person_name_ptr(index: u32) -> *const u8 { PEOPLE.get(index as usize).map_or(std::ptr::null(), |person| person.name.as_ptr()) }
#[no_mangle]
pub extern "C" fn person_name_len(index: u32) -> u32 { PEOPLE.get(index as usize).map_or(0, |person| person.name.len() as u32) }
#[no_mangle]
pub extern "C" fn person_traits(index: u32) -> u32 { PEOPLE.get(index as usize).map_or(0, |person| person.traits as u32) }
#[no_mangle]
pub extern "C" fn property_name_ptr(index: u32) -> *const u8 { PROPERTY_PHRASES.get(index as usize).map_or(std::ptr::null(), |phrase| phrase.as_ptr()) }
#[no_mangle]
pub extern "C" fn property_name_len(index: u32) -> u32 { PROPERTY_PHRASES.get(index as usize).map_or(0, |phrase| phrase.len() as u32) }
#[no_mangle]
pub extern "C" fn game_new(seed: u32) { *state_mut() = Game::new(seed); }
#[no_mangle]
pub extern "C" fn game_candidates_mask() -> u32 { state_mut().candidates }
#[no_mangle]
pub extern "C" fn game_candidate_count() -> u32 { state_mut().candidates.count_ones() }
#[no_mangle]
pub extern "C" fn game_can_ask(property: u32) -> u32 { state_mut().can_ask(property) as u32 }
#[no_mangle]
pub extern "C" fn game_ask(property: u32) -> u32 { state_mut().ask(property) }
#[no_mangle]
pub extern "C" fn game_winner() -> u32 { state_mut().winner }
#[no_mangle]
pub extern "C" fn game_last_question() -> u32 { state_mut().last_question }
#[no_mangle]
pub extern "C" fn game_last_answer() -> u32 { state_mut().last_answer }
#[no_mangle]
pub extern "C" fn game_last_eliminated() -> u32 { state_mut().last_eliminated }
#[no_mangle]
pub extern "C" fn game_turns() -> u32 { state_mut().turns }
