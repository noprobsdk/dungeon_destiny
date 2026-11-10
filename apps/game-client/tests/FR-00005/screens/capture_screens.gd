# FR-00005 screen test: renders the loading screen in each state at the window
# size Godot was started with, saves a PNG of each, and checks that every
# visible control lies inside the window. HTTP is stubbed.
#
# Run with a real renderer (not --headless), for example under Xvfb:
#   godot --rendering-method gl_compatibility --resolution 720x1280 \
#     --path apps/game-client -s res://tests/FR-00005/screens/capture_screens.gd -- <out_dir> <size_name>
extends SceneTree

const Fixtures = preload("res://tests/FR-00005/fixtures.gd")
const PendingTransport = preload("res://tests/FR-00005/screens/pending_transport.gd")
const LoadingScreenScene = preload("res://scenes/loading_screen.tscn")

var failures := 0


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	var out_dir: String = args[0] if args.size() > 0 else "user://screens"
	var size_name: String = args[1] if args.size() > 1 else "screen"
	DirAccess.make_dir_recursive_absolute(out_dir)
	var states := {
		"1-checking": [],
		"2-update-available": [_answer(200, Fixtures.version_ok(true, false))],
		"3-connecting": [_answer(200, Fixtures.version_ok(true, true))],
		"4-ready": [_answer(200, Fixtures.version_ok(true, true)), _answer(200, Fixtures.health_ok())],
		"5-update-required": [_answer(200, Fixtures.version_ok(false, false))],
		"6-connection-error": [_answer(500, Fixtures.error("SERVER_MISCONFIGURED"))],
	}
	for state_name: String in states:
		await _capture(state_name, states[state_name], out_dir, size_name)
	print("FR-00005 screens %s: %d states, %d layout problems" % [size_name, states.size(), failures])
	quit(1 if failures > 0 else 0)


func _answer(http_status: int, body: Dictionary) -> Dictionary:
	return {"ok": true, "http_status": http_status, "body": JSON.stringify(body), "error": ""}


func _capture(state_name: String, answers: Array, out_dir: String, size_name: String) -> void:
	var transport := PendingTransport.new()
	transport.answers.assign(answers)
	var screen: LoadingScreen = LoadingScreenScene.instantiate()
	screen.autostart = false
	screen.client = ApiClient.new(transport, "https://gateway.example.test")
	root.add_child(screen)
	screen.run()
	for i in 6:
		await process_frame
	_check_layout(screen, state_name, size_name)
	var path := "%s/%s-%s.png" % [out_dir, size_name, state_name]
	root.get_viewport().get_texture().get_image().save_png(path)
	print("saved %s" % path)
	screen.queue_free()
	await process_frame


# Every visible label and button must lie fully inside the window.
func _check_layout(node: Node, state_name: String, size_name: String) -> void:
	var bounds := Rect2(Vector2.ZERO, root.get_visible_rect().size).grow(0.5)
	for child in node.find_children("*", "Control", true, false):
		var control := child as Control
		if not control.is_visible_in_tree() or not (control is Label or control is Button):
			continue
		if control is Label and (control as Label).text.is_empty():
			continue
		if not bounds.encloses(control.get_global_rect()):
			failures += 1
			print("LAYOUT %s %s: %s %s lies outside the window %s" % [size_name, state_name, control.name, control.get_global_rect(), bounds])
