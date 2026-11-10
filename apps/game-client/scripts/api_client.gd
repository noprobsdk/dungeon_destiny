# FR-00005: calls the gateway Worker, the only service the app talks to
# (DD-017). Every request carries the app headers (DD-023). The transport is
# passed in, so tests can replace the network with a stub.
class_name ApiClient
extends RefCounted

# Anything with send(url: String, headers: PackedStringArray) -> Dictionary,
# returning {ok, http_status, body, error}. HttpTransport in the app.
var transport: Object
var base_url: String


func _init(p_transport: Object, p_base_url: String) -> void:
	transport = p_transport
	base_url = p_base_url.trim_suffix("/")


func headers() -> PackedStringArray:
	return PackedStringArray([
		"X-App-Platform: %s" % AppInfo.PLATFORM,
		"X-App-Build: %d" % AppInfo.BUILD,
		"Accept: application/json",
	])


# Returns {kind: "network_error", error} or
# {kind: "response", http_status, valid, body}.
func get_json(path: String) -> Dictionary:
	var answer: Dictionary = await transport.send(base_url + path, headers())
	if not answer.ok:
		print("[gateway] %s failed: %s" % [path, answer.error])
		return {"kind": "network_error", "error": answer.error}
	var parsed := ResponseParser.parse(answer.body)
	var result := {"kind": "response", "http_status": answer.http_status, "valid": parsed.valid, "body": parsed.body}
	print("[gateway] %s -> HTTP %d, requestId %s" % [path, answer.http_status, VersionCheck.request_id(result)])
	return result
