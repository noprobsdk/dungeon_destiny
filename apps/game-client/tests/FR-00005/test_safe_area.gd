# FR-00005: the UI stays inside the safe area of the app's own window, also
# when the window is smaller than the screen (desktop, split screen).
extends GutTest


func test_a_full_screen_window_without_cutouts_has_no_insets() -> void:
	var insets := LoadingScreen.safe_area_insets(Rect2i(0, 0, 1080, 2400), Rect2i(0, 0, 1080, 2400))
	assert_eq(insets, Vector4i(0, 0, 0, 0))


func test_a_notch_and_a_navigation_bar_become_top_and_bottom_insets() -> void:
	var insets := LoadingScreen.safe_area_insets(Rect2i(0, 0, 1080, 2400), Rect2i(0, 120, 1080, 2140))
	assert_eq(insets, Vector4i(0, 120, 0, 140))


func test_a_window_smaller_than_the_screen_uses_only_its_own_part_of_the_safe_area() -> void:
	# A 720 x 1280 window at (100, 50) on a 1280 x 1600 screen that is safe everywhere.
	var insets := LoadingScreen.safe_area_insets(Rect2i(100, 50, 720, 1280), Rect2i(0, 0, 1280, 1600))
	assert_eq(insets, Vector4i(0, 0, 0, 0))


func test_a_window_overlapping_a_cutout_gets_only_the_overlap() -> void:
	var insets := LoadingScreen.safe_area_insets(Rect2i(0, 0, 720, 1280), Rect2i(0, 80, 1280, 1520))
	assert_eq(insets, Vector4i(0, 80, 0, 0))


func test_no_safe_area_information_means_no_insets() -> void:
	assert_eq(LoadingScreen.safe_area_insets(Rect2i(0, 0, 0, 0), Rect2i(0, 0, 0, 0)), Vector4i(0, 0, 0, 0))
	assert_eq(LoadingScreen.safe_area_insets(Rect2i(0, 0, 720, 1280), Rect2i(2000, 0, 100, 100)), Vector4i(0, 0, 0, 0))
