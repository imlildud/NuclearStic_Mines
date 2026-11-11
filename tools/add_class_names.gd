@tool
extends EditorScript

# Adds `class_name X` to every .gd that needs it and doesn't have one.
# Uses the ACTUAL paths from the project tree.
# Run from: Script editor → File → Run (Ctrl+Shift+X).

const TARGETS := {
	# ---- managers/core (GameManager, GameModeManager, LevelConfigurator, UIManager) ----
	"res://scripts/managers/core/GameModeManager.gd": "GameModeManager",
	"res://scripts/managers/core/LevelConfigurator.gd": "LevelConfigurator",
	"res://scripts/managers/core/UIManager.gd": "UIManager",

	# ---- managers/flag ----
	"res://scripts/managers/flag/FlagManager.gd": "FlagManager",
	"res://scripts/managers/flag/FlagModeManager.gd": "FlagModeManager",

	# ---- managers/hazards (HazardManager + CritickerDialogs + CritickerDialogManager) ----
	"res://scripts/managers/hazards/HazardManager.gd": "HazardManager",
	"res://scripts/managers/hazards/CritickerDialogs.gd": "CritickerDialogs",
	"res://scripts/managers/hazards/CritickerDialogManager.gd": "CritickerDialogManager",

	# ---- managers/keychains ----
	"res://scripts/managers/keychains/KeychainManager.gd": "KeychainManager",
	"res://scripts/managers/keychains/KeychainUIManager.gd": "KeychainUIManager",
	"res://scripts/managers/keychains/LinkManager.gd": "LinkManager",
	"res://scripts/managers/keychains/ReversionManager.gd": "ReversionManager",

	# ---- managers/bundles ----
	"res://scripts/managers/bundles/BundleManager.gd": "BundleManager",
	"res://scripts/managers/bundles/BundleUIManager.gd": "BundleUIManager",

	# ---- managers/save ----
	"res://scripts/managers/save/ScoreboardManager.gd": "ScoreboardManager",

	# ---- managers/tutorial ----
	"res://scripts/managers/tutorial/TutorialManager.gd": "TutorialManager",
	"res://scripts/managers/tutorial/TutorialDialogManager.gd": "TutorialDialogManager",

	# ---- controllers ----
	"res://scripts/controllers/board/BoardController.gd": "BoardController",
	"res://scripts/controllers/board/TutorialController.gd": "TutorialController",
	"res://scripts/controllers/board/TestController.gd": "TestController",
	"res://scripts/controllers/character/CharacterController.gd": "CharacterController",
	"res://scripts/controllers/obstacles/SpikeController.gd": "SpikeController",
	"res://scripts/controllers/foes/CritickerController.gd": "CritickerController",
}


func _run() -> void:
	var added := 0
	var skipped := 0
	var failed := 0

	for path in TARGETS.keys():
		var class_name_value: String = TARGETS[path]
		var file := FileAccess.open(path, FileAccess.READ)
		if file == null:
			push_warning("Cannot open: " + path)
			failed += 1
			continue
		var content: String = file.get_as_text()
		file.close()

		if content.contains("class_name " + class_name_value):
			print("OK (already has): " + path)
			skipped += 1
			continue

		var lines: PackedStringArray = content.split("\n")
		var insert_index: int = -1
		for i in range(lines.size()):
			if lines[i].begins_with("extends "):
				insert_index = i + 1
				break

		if insert_index == -1:
			push_warning("No extends line found: " + path)
			failed += 1
			continue

		lines.insert(insert_index, "class_name " + class_name_value)

		var out := FileAccess.open(path, FileAccess.WRITE)
		if out == null:
			push_warning("Cannot write: " + path)
			failed += 1
			continue
		out.store_string("\n".join(lines))
		out.close()
		print("ADDED: " + path + " -> class_name " + class_name_value)
		added += 1

	print("================================")
	print("Added: %d | Skipped: %d | Failed: %d" % [added, skipped, failed])
	print("================================")
