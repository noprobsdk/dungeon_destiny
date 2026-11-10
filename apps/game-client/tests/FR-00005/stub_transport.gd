# FR-00005: a stand-in for the HTTP transport in tests. It never touches the
# network: it records each call and answers with the queued responses.
extends RefCounted

var calls: Array[Dictionary] = []
var responses: Array[Dictionary] = []


func queue_response(http_status: int, body: Variant) -> void:
	var text: String = body if body is String else JSON.stringify(body)
	responses.append({"ok": true, "http_status": http_status, "body": text, "error": ""})


func queue_network_error(error: String = "timeout") -> void:
	responses.append({"ok": false, "http_status": 0, "body": "", "error": error})


func send(url: String, headers: PackedStringArray) -> Dictionary:
	calls.append({"url": url, "headers": headers})
	if responses.is_empty():
		return {"ok": false, "http_status": 0, "body": "", "error": "no stubbed response"}
	return responses.pop_front()
