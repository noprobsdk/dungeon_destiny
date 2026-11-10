# FR-00005: the loading screen runs the version check, then the health call,
# and shows the right state (Section 9). HTTP is stubbed; the real gateway is
# never called.
extends GutTest

const StubTransport = preload("res://tests/FR-00005/stub_transport.gd")
const Fixtures = preload("res://tests/FR-00005/fixtures.gd")
const LoadingScreenScene = preload("res://scenes/loading_screen.tscn")

var transport_stub: StubTransport
var screen: LoadingScreen
var opened: Array[String] = []


func before_each() -> void:
	transport_stub = StubTransport.new()
	screen = LoadingScreenScene.instantiate()
	screen.autostart = false
	screen.client = ApiClient.new(transport_stub, "https://gateway.example.test")
	opened = []
	screen.url_opener = func(url: String) -> void: opened.append(url)
	add_child_autofree(screen)


func _text(node_name: String) -> String:
	return (screen.find_child(node_name, true, false) as Label).text


func _button(node_name: String) -> Button:
	return screen.find_child(node_name, true, false) as Button


func test_shows_the_app_version() -> void:
	assert_eq(_text("VersionLabel"), "%s (build %d)" % [AppInfo.VERSION_NAME, AppInfo.BUILD])
	assert_eq(_text("VersionLabel"), "0.1.0 (build 1)")


func test_a_supported_app_shows_the_health_result_and_is_ready() -> void:
	transport_stub.queue_response(200, Fixtures.version_ok(true, true))
	transport_stub.queue_response(200, Fixtures.health_ok())
	await screen.run()
	assert_eq(screen.state, LoadingScreen.State.READY)
	assert_eq(transport_stub.calls.size(), 2)
	assert_string_ends_with(transport_stub.calls[0].url, "/app/version")
	assert_string_ends_with(transport_stub.calls[1].url, "/health")
	var health := _text("HealthLabel")
	assert_string_contains(health, "ok")
	assert_string_contains(health, "dev")
	assert_string_contains(health, "dev-20261108-100000")
	assert_false(_button("RetryButton").visible)


func test_an_unsupported_app_shows_update_required_and_stops() -> void:
	transport_stub.queue_response(200, Fixtures.version_ok(false, false))
	await screen.run()
	assert_eq(screen.state, LoadingScreen.State.UPDATE_REQUIRED)
	assert_eq(transport_stub.calls.size(), 1, "the health call is not made")
	assert_string_contains(_text("MessageLabel"), "Update required")
	assert_false(_button("RetryButton").visible)
	assert_false(_button("DismissButton").visible)


func test_an_outdated_app_shows_a_dismissable_message_then_continues() -> void:
	transport_stub.queue_response(200, Fixtures.version_ok(true, false))
	transport_stub.queue_response(200, Fixtures.health_ok())
	screen.run()
	await wait_until(func() -> bool: return screen.state == LoadingScreen.State.UPDATE_AVAILABLE, 2)
	assert_eq(screen.state, LoadingScreen.State.UPDATE_AVAILABLE)
	assert_string_contains(_text("MessageLabel"), "new version")
	assert_true(_button("DismissButton").visible)
	_button("DismissButton").pressed.emit()
	await wait_for_signal(screen.finished, 2)
	assert_eq(screen.state, LoadingScreen.State.READY)


func test_a_network_error_shows_the_connection_error_and_retry() -> void:
	transport_stub.queue_network_error("timeout")
	await screen.run()
	assert_eq(screen.state, LoadingScreen.State.CONNECTION_ERROR)
	assert_true(_button("RetryButton").visible)
	assert_eq(_text("RequestIdLabel"), "", "no request ID without a server answer")


func test_a_server_error_shows_the_request_id() -> void:
	transport_stub.queue_response(500, Fixtures.error("SERVER_MISCONFIGURED"))
	await screen.run()
	assert_eq(screen.state, LoadingScreen.State.CONNECTION_ERROR)
	assert_string_contains(_text("RequestIdLabel"), "99999999-2222-4333-8444-555555555555")


func test_retry_starts_again_with_the_version_check() -> void:
	transport_stub.queue_network_error("timeout")
	await screen.run()
	transport_stub.queue_response(200, Fixtures.version_ok(true, true))
	transport_stub.queue_response(200, Fixtures.health_ok())
	_button("RetryButton").pressed.emit()
	await wait_for_signal(screen.finished, 2)
	assert_eq(screen.state, LoadingScreen.State.READY)
	assert_string_ends_with(transport_stub.calls[1].url, "/app/version")


func test_http_426_on_the_health_call_shows_update_required() -> void:
	transport_stub.queue_response(200, Fixtures.version_ok(true, true))
	transport_stub.queue_response(426, Fixtures.error("APP_UPDATE_REQUIRED"))
	await screen.run()
	assert_eq(screen.state, LoadingScreen.State.UPDATE_REQUIRED)


func test_buttons_are_at_least_48_dp_high() -> void:
	for button_name in ["RetryButton", "DismissButton", "UpdateButton"]:
		assert_gte(_button(button_name).custom_minimum_size.y, LoadingScreen.MIN_BUTTON_HEIGHT)
	assert_gte(LoadingScreen.MIN_BUTTON_HEIGHT, 96.0, "48 dp at the 720-wide base viewport")


func test_update_required_shows_the_update_button_which_opens_the_link() -> void:
	transport_stub.queue_response(200, Fixtures.version_ok(false, false))
	await screen.run()
	assert_eq(screen.state, LoadingScreen.State.UPDATE_REQUIRED)
	assert_true(_button("UpdateButton").visible)
	assert_false(_button("DismissButton").visible, "update required has no way to continue")
	_button("UpdateButton").pressed.emit()
	assert_eq(opened, [Fixtures.UPDATE_URL])
	assert_eq(screen.state, LoadingScreen.State.UPDATE_REQUIRED, "opening the link does not continue")


func test_update_available_shows_the_update_button_next_to_continue() -> void:
	transport_stub.queue_response(200, Fixtures.version_ok(true, false))
	transport_stub.queue_response(200, Fixtures.health_ok())
	screen.run()
	await wait_until(func() -> bool: return screen.state == LoadingScreen.State.UPDATE_AVAILABLE, 2)
	assert_true(_button("UpdateButton").visible)
	assert_true(_button("DismissButton").visible)
	_button("UpdateButton").pressed.emit()
	assert_eq(opened, [Fixtures.UPDATE_URL])
	_button("DismissButton").pressed.emit()
	await wait_for_signal(screen.finished, 2)
	assert_eq(screen.state, LoadingScreen.State.READY)
	assert_false(_button("UpdateButton").visible)


func test_without_a_link_the_update_button_is_hidden() -> void:
	for update_url: Variant in [null, "", "http://store.example.test/", "market://details?id=x", 42]:
		transport_stub.queue_response(200, Fixtures.version_ok(false, false, update_url))
		await screen.run()
		assert_eq(screen.state, LoadingScreen.State.UPDATE_REQUIRED)
		assert_false(_button("UpdateButton").visible, "no button for %s" % [update_url])
	assert_eq(opened, [] as Array[String])


func test_without_a_link_update_available_can_still_be_dismissed() -> void:
	transport_stub.queue_response(200, Fixtures.version_ok(true, false, null))
	transport_stub.queue_response(200, Fixtures.health_ok())
	screen.run()
	await wait_until(func() -> bool: return screen.state == LoadingScreen.State.UPDATE_AVAILABLE, 2)
	assert_false(_button("UpdateButton").visible)
	_button("DismissButton").pressed.emit()
	await wait_for_signal(screen.finished, 2)
	assert_eq(screen.state, LoadingScreen.State.READY)


func test_http_426_uses_the_link_from_the_version_check() -> void:
	transport_stub.queue_response(200, Fixtures.version_ok(true, true))
	transport_stub.queue_response(426, Fixtures.error("APP_UPDATE_REQUIRED"))
	await screen.run()
	assert_eq(screen.state, LoadingScreen.State.UPDATE_REQUIRED)
	assert_true(_button("UpdateButton").visible)
	_button("UpdateButton").pressed.emit()
	assert_eq(opened, [Fixtures.UPDATE_URL])


func test_ready_and_connection_error_have_no_update_button() -> void:
	transport_stub.queue_response(200, Fixtures.version_ok(true, true))
	transport_stub.queue_response(200, Fixtures.health_ok())
	await screen.run()
	assert_false(_button("UpdateButton").visible)
	transport_stub.queue_network_error("timeout")
	await screen.run()
	assert_eq(screen.state, LoadingScreen.State.CONNECTION_ERROR)
	assert_false(_button("UpdateButton").visible)


func test_the_app_opens_links_with_the_system() -> void:
	var fresh: LoadingScreen = LoadingScreenScene.instantiate()
	assert_true(fresh.url_opener.is_valid(), "the default opener is set")
	fresh.free()
