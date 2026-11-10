# FR-00005: checks that a response body is in the standard format (DD-019).
# Anything else is treated as a connection error by the caller.
class_name ResponseParser
extends RefCounted


static func parse(text: String) -> Dictionary:
	# JSON.parse() reports bad text through its return value, without writing
	# an engine error.
	var json := JSON.new()
	if text.is_empty() or json.parse(text) != OK:
		return {"valid": false, "body": {}}
	var body: Variant = json.data
	if not body is Dictionary:
		return {"valid": false, "body": {}}
	return {"valid": _is_standard(body), "body": body}


static func _is_standard(body: Dictionary) -> bool:
	for field in ["status", "code", "message", "data", "meta"]:
		if not body.has(field):
			return false
	if body.status != "ok" and body.status != "error":
		return false
	if body.code != null and not body.code is String:
		return false
	if not body.message is String:
		return false
	var meta: Variant = body.meta
	if not meta is Dictionary:
		return false
	for field in ["requestId", "timestamp", "service", "environment"]:
		if not meta.get(field) is String:
			return false
	var version: Variant = meta.get("version")
	if not version is Dictionary:
		return false
	for field in ["id", "tag", "createdAt"]:
		if not version.get(field) is String:
			return false
	return true
