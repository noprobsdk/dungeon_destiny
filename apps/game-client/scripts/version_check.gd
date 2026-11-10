# FR-00005: turns the gateway's answers into what the app does next (DD-023).
# The gateway decides whether a build is supported; the app only follows it.
class_name VersionCheck
extends RefCounted

enum Outcome { CONTINUE, UPDATE_AVAILABLE, UPDATE_REQUIRED, CONNECTION_ERROR }

const UPDATE_REQUIRED_CODE := "APP_UPDATE_REQUIRED"


# The outcome of GET /app/version.
static func version_outcome(result: Dictionary) -> Outcome:
	if _is_update_required(result):
		return Outcome.UPDATE_REQUIRED
	if not _is_ok(result):
		return Outcome.CONNECTION_ERROR
	var data: Variant = result.body.data
	if not data is Dictionary or not data.get("supported") is bool or not data.get("upToDate") is bool:
		return Outcome.CONNECTION_ERROR
	if not data.supported:
		return Outcome.UPDATE_REQUIRED
	if not data.upToDate:
		return Outcome.UPDATE_AVAILABLE
	return Outcome.CONTINUE


# The outcome of any other call, such as GET /health.
static func health_outcome(result: Dictionary) -> Outcome:
	if _is_update_required(result):
		return Outcome.UPDATE_REQUIRED
	if not _is_ok(result):
		return Outcome.CONNECTION_ERROR
	return Outcome.CONTINUE


# The update link from GET /app/version, or "" when there is none. Only an
# https address is used, whatever the server sends.
static func update_url(result: Dictionary) -> String:
	if not _is_ok(result):
		return ""
	var data: Variant = result.body.data
	if not data is Dictionary:
		return ""
	var url: Variant = data.get("updateUrl")
	if not url is String or not (url as String).begins_with("https://") or (url as String).strip_edges() != url:
		return ""
	return url


# The server's requestId, when the server answered in the standard format.
static func request_id(result: Dictionary) -> String:
	if result.get("kind") != "response" or not result.get("valid", false):
		return ""
	return result.body.meta.requestId


static func _is_update_required(result: Dictionary) -> bool:
	return (
		result.get("kind") == "response"
		and result.get("valid", false)
		and result.http_status == 426
		and result.body.code == UPDATE_REQUIRED_CODE
	)


static func _is_ok(result: Dictionary) -> bool:
	return (
		result.get("kind") == "response"
		and result.get("valid", false)
		and result.http_status == 200
		and result.body.status == "ok"
	)
