mod data;

use data::{PEOPLE, PROPERTY_PHRASES};

#[no_mangle]
pub extern "C" fn api_version() -> u32 { 1 }

#[no_mangle]
pub extern "C" fn person_count() -> u32 { PEOPLE.len() as u32 }

#[no_mangle]
pub extern "C" fn property_count() -> u32 { PROPERTY_PHRASES.len() as u32 }

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
