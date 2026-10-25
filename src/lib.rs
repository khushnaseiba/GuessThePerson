#![allow(static_mut_refs)]

mod data;
mod game;

use data::{PEOPLE, PROPERTY_PHRASES};
use game::Game;

static mut STATE: Game = Game::empty();

fn state_mut() -> &'static mut Game {
    unsafe { &mut *std::ptr::addr_of_mut!(STATE) }
}

#[no_mangle]
pub extern "C" fn api_version() -> u32 {
    1
}

#[no_mangle]
pub extern "C" fn person_count() -> u32 {
    PEOPLE.len() as u32
}

#[no_mangle]
pub extern "C" fn property_count() -> u32 {
    PROPERTY_PHRASES.len() as u32
}

#[no_mangle]
pub extern "C" fn person_name_ptr(index: u32) -> *const u8 {
    PEOPLE.get(index as usize).map_or(std::ptr::null(), |person| person.name.as_ptr())
}

#[no_mangle]
pub extern "C" fn person_name_len(index: u32) -> u32 {
    PEOPLE.get(index as usize).map_or(0, |person| person.name.len() as u32)
}

#[no_mangle]
pub extern "C" fn person_traits(index: u32) -> u32 {
    PEOPLE.get(index as usize).map_or(0, |person| person.traits as u32)
}

#[no_mangle]
pub extern "C" fn property_name_ptr(index: u32) -> *const u8 {
    PROPERTY_PHRASES.get(index as usize).map_or(std::ptr::null(), |phrase| phrase.as_ptr())
}

#[no_mangle]
pub extern "C" fn property_name_len(index: u32) -> u32 {
    PROPERTY_PHRASES.get(index as usize).map_or(0, |phrase| phrase.len() as u32)
}

#[no_mangle]
pub extern "C" fn game_new(seed: u32) {
    *state_mut() = Game::new(seed);
}

#[no_mangle]
pub extern "C" fn game_human_target() -> u32 {
    state_mut().human_target
}

#[no_mangle]
pub extern "C" fn game_candidates_mask() -> u32 {
    state_mut().candidates
}

#[no_mangle]
pub extern "C" fn game_bot_candidates_count() -> u32 {
    state_mut().bot_candidates.count_ones()
}

#[no_mangle]
pub extern "C" fn game_candidate_count() -> u32 {
    state_mut().candidates.count_ones()
}

#[no_mangle]
pub extern "C" fn game_can_ask(property: u32) -> u32 {
    state_mut().can_ask(property) as u32
}

#[no_mangle]
pub extern "C" fn game_ask(property: u32) -> u32 {
    state_mut().ask(property)
}

#[no_mangle]
pub extern "C" fn game_winner() -> u32 {
    state_mut().winner
}

#[no_mangle]
pub extern "C" fn game_last_human_question() -> u32 {
    state_mut().last_human_question
}

#[no_mangle]
pub extern "C" fn game_last_human_answer() -> u32 {
    state_mut().last_human_answer
}

#[no_mangle]
pub extern "C" fn game_last_human_eliminated() -> u32 {
    state_mut().last_human_eliminated
}

#[no_mangle]
pub extern "C" fn game_last_bot_question() -> u32 {
    state_mut().last_bot_question
}

#[no_mangle]
pub extern "C" fn game_last_bot_answer() -> u32 {
    state_mut().last_bot_answer
}

#[no_mangle]
pub extern "C" fn game_last_bot_eliminated() -> u32 {
    state_mut().last_bot_eliminated
}

#[no_mangle]
pub extern "C" fn game_turns() -> u32 {
    state_mut().turns
}
