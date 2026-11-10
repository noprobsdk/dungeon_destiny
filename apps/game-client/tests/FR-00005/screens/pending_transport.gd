# FR-00005: a transport that never answers, to hold the loading screen in its
# "Checking version…" or "Connecting…" state for a screenshot.
extends RefCounted

signal _never

var answers: Array[Dictionary] = []


func send(_url: String, _headers: PackedStringArray) -> Dictionary:
	if not answers.is_empty():
		return answers.pop_front()
	await _never
	return {}
