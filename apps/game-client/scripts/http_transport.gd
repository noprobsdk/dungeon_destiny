# FR-00005: the real HTTP transport, with a 10-second timeout per call.
class_name HttpTransport
extends Node

const TIMEOUT_SECONDS := 10.0


func send(url: String, request_headers: PackedStringArray) -> Dictionary:
	var request := HTTPRequest.new()
	request.timeout = TIMEOUT_SECONDS
	add_child(request)
	var error := request.request(url, request_headers, HTTPClient.METHOD_GET)
	if error != OK:
		request.queue_free()
		return {"ok": false, "http_status": 0, "body": "", "error": "request not started (%d)" % error}
	var completed: Array = await request.request_completed
	request.queue_free()
	var result: int = completed[0]
	if result != HTTPRequest.RESULT_SUCCESS:
		var reason := "timeout" if result == HTTPRequest.RESULT_TIMEOUT else "network error (%d)" % result
		return {"ok": false, "http_status": 0, "body": "", "error": reason}
	var body: PackedByteArray = completed[3]
	return {"ok": true, "http_status": completed[1], "body": body.get_string_from_utf8(), "error": ""}
