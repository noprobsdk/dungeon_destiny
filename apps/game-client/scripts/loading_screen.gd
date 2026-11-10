# FR-00005: the loading screen (Section 9). It shows the app version, checks
# the version with the gateway (DD-023), then calls /health and shows the
# result. Every failure leads to a connection error with a retry button. Both
# update screens have an Update button that opens the gateway's update link.
class_name LoadingScreen
extends Control

signal finished(state: State)
signal _dismissed

enum State { IDLE, CHECKING_VERSION, CONNECTING, UPDATE_AVAILABLE, UPDATE_REQUIRED, CONNECTION_ERROR, READY }

# 48 dp at the 720-pixel-wide base viewport, which maps to a 360 dp phone.
const MIN_BUTTON_HEIGHT := 96.0
const MARGIN := 32

# Tests set these before the screen enters the tree.
var autostart := true
var client: ApiClient
# Opens a link outside the app. Tests replace it so nothing is opened.
var url_opener: Callable = Callable(OS, "shell_open")
var state: State = State.IDLE

var _margin: MarginContainer
var _status: Label
var _message: Label
var _health: Label
var _request_id: Label
var _dismiss: Button
var _retry: Button
var _update: Button
# The link from the last version check, kept for HTTP 426 on later calls.
var _update_url := ""


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build()
	get_viewport().size_changed.connect(_apply_safe_area)
	_apply_safe_area()
	if client == null:
		var transport := HttpTransport.new()
		add_child(transport)
		client = ApiClient.new(transport, AppInfo.gateway_url())
	if autostart:
		run()


func run() -> void:
	# Start on the next frame, so the screen is drawn and callers can wait for
	# `finished`.
	await get_tree().process_frame
	_set_state(State.CHECKING_VERSION, "Checking version…")
	var version: Dictionary = await client.get_json("/app/version")
	_update_url = VersionCheck.update_url(version)
	match VersionCheck.version_outcome(version):
		VersionCheck.Outcome.UPDATE_REQUIRED:
			_show_update_required()
			return
		VersionCheck.Outcome.CONNECTION_ERROR:
			_show_connection_error(version)
			return
		VersionCheck.Outcome.UPDATE_AVAILABLE:
			_set_state(State.UPDATE_AVAILABLE, "")
			_message.text = "A new version is available. You can keep playing and update later."
			_dismiss.visible = true
			_update.visible = not _update_url.is_empty()
			await _dismissed
			_dismiss.visible = false
			_update.visible = false
			_message.text = ""

	_set_state(State.CONNECTING, "Connecting…")
	var health: Dictionary = await client.get_json("/health")
	match VersionCheck.health_outcome(health):
		VersionCheck.Outcome.UPDATE_REQUIRED:
			_show_update_required()
			return
		VersionCheck.Outcome.CONNECTION_ERROR:
			_show_connection_error(health)
			return
	var body: Dictionary = health.body
	_health.text = "Server: %s · %s\nServer version: %s" % [body.status, body.meta.environment, body.meta.version.tag]
	_set_state(State.READY, "Ready")
	finished.emit(state)


func _show_update_required() -> void:
	_set_state(State.UPDATE_REQUIRED, "")
	_message.text = "Update required\nThis version of Dungeon Destiny is no longer supported. Please install the latest version."
	_update.visible = not _update_url.is_empty()
	finished.emit(state)


func _show_connection_error(result: Dictionary) -> void:
	_set_state(State.CONNECTION_ERROR, "")
	_message.text = "Could not connect to the server. Check your internet connection and try again."
	var request_id := VersionCheck.request_id(result)
	_request_id.text = "Request ID: %s" % request_id if not request_id.is_empty() else ""
	_retry.visible = true
	finished.emit(state)


func _set_state(new_state: State, status_text: String) -> void:
	state = new_state
	_status.text = status_text
	_retry.visible = false
	_dismiss.visible = false
	_update.visible = false
	_request_id.text = ""
	if new_state == State.CHECKING_VERSION:
		_message.text = ""
		_health.text = ""
	print("[loading] %s" % State.keys()[new_state])


func _on_retry_pressed() -> void:
	run()


func _on_dismiss_pressed() -> void:
	_dismissed.emit()


func _on_update_pressed() -> void:
	if _update_url.is_empty():
		return
	print("[loading] opening the update link")
	url_opener.call(_update_url)


func _build() -> void:
	_margin = MarginContainer.new()
	_margin.name = "SafeArea"
	_margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_margin)
	var column := VBoxContainer.new()
	column.alignment = BoxContainer.ALIGNMENT_CENTER
	column.add_theme_constant_override("separation", 24)
	_margin.add_child(column)
	column.add_child(_label("TitleLabel", "Dungeon Destiny", 56))
	column.add_child(_label("VersionLabel", AppInfo.display_version(), 24))
	_status = _label("StatusLabel", "", 30)
	column.add_child(_status)
	_message = _label("MessageLabel", "", 30)
	column.add_child(_message)
	_health = _label("HealthLabel", "", 26)
	column.add_child(_health)
	_request_id = _label("RequestIdLabel", "", 18)
	column.add_child(_request_id)
	_update = _button("UpdateButton", "Update")
	_update.pressed.connect(_on_update_pressed)
	column.add_child(_update)
	_dismiss = _button("DismissButton", "Continue")
	_dismiss.pressed.connect(_on_dismiss_pressed)
	column.add_child(_dismiss)
	_retry = _button("RetryButton", "Retry")
	_retry.pressed.connect(_on_retry_pressed)
	column.add_child(_retry)


func _label(node_name: String, text: String, font_size: int) -> Label:
	var label := Label.new()
	label.name = node_name
	label.text = text
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	return label


func _button(node_name: String, text: String) -> Button:
	var button := Button.new()
	button.name = node_name
	button.text = text
	button.visible = false
	button.custom_minimum_size = Vector2(0, MIN_BUTTON_HEIGHT)
	button.add_theme_font_size_override("font_size", 30)
	return button


# Keeps the UI out of notches, camera holes, and system bars.
func _apply_safe_area() -> void:
	var window := Rect2i(DisplayServer.window_get_position(), DisplayServer.window_get_size())
	var insets := safe_area_insets(window, DisplayServer.get_display_safe_area())
	var scale := Vector2.ONE
	if window.size.x > 0 and window.size.y > 0:
		scale = get_viewport_rect().size / Vector2(window.size)
	_margin.add_theme_constant_override("margin_left", MARGIN + int(insets.x * scale.x))
	_margin.add_theme_constant_override("margin_top", MARGIN + int(insets.y * scale.y))
	_margin.add_theme_constant_override("margin_right", MARGIN + int(insets.z * scale.x))
	_margin.add_theme_constant_override("margin_bottom", MARGIN + int(insets.w * scale.y))


# The part of the window, in window pixels, that lies outside the safe area:
# left, top, right, bottom. The safe area is in screen coordinates and may be
# larger than the window, so only its overlap with the window counts.
static func safe_area_insets(window: Rect2i, safe: Rect2i) -> Vector4i:
	if window.size.x <= 0 or window.size.y <= 0 or safe.size.x <= 0 or safe.size.y <= 0:
		return Vector4i.ZERO
	var visible := window.intersection(safe)
	if visible.size.x <= 0 or visible.size.y <= 0:
		return Vector4i.ZERO
	return Vector4i(
		visible.position.x - window.position.x,
		visible.position.y - window.position.y,
		window.end.x - visible.end.x,
		window.end.y - visible.end.y
	)
