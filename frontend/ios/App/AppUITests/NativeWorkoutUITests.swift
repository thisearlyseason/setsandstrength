import XCTest

final class NativeWorkoutUITests: XCTestCase {
    let app = XCUIApplication()
    private var restoreRadios: (() -> Void)?
    override func tearDown() { restoreRadios?(); restoreRadios = nil; super.tearDown() }
    override func setUp() { continueAfterFailure = false; XCUIDevice.shared.orientation = .portrait; app.launch() }
    private func button(_ label: String) -> XCUIElement { app.buttons.matching(NSPredicate(format: "label ==[c] %@", label)).firstMatch }
    private func navigation(_ label: String) -> XCUIElement {
        let alternate = label == "Your progress" ? "Progress" : label
        return app.links.matching(NSPredicate(format: "label ==[c] %@ OR label ==[c] %@", label, alternate)).firstMatch
    }
    private func tap(_ element: XCUIElement) {
        let found = element.waitForExistence(timeout: 30)
        if !found { print("UI TREE: \(app.debugDescription)") }
        XCTAssertTrue(found)
        guard found else { return }
        // WebKit can report a button hittable while the fixed phone navigation covers it.
        if (element.elementType == .button || element.elementType == .switch || element.elementType == .textField || element.elementType == .textView || element.elementType == .checkBox) && app.alerts.count == 0 && element.label != "Open profile" {
            for _ in 0..<14 {
                let frame = element.frame
                if frame.midY > app.frame.height - 150 { app.swipeUp() }
                else if frame.midY < 100 { app.swipeDown() }
                else { break }
            }
        }
        element.tap()
    }
    private func shot(_ name: String) { let a = XCTAttachment(screenshot: app.screenshot()); a.name = name; a.lifetime = .keepAlways; add(a) }
    func testBuilderPreviewAndWeeklyFlow() {
        tap(button("Build a workout"))
        tap(button("Build workout"))
        XCTAssertTrue(button("Save to plans").waitForExistence(timeout: 20))
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH[c] 'Swap '")).firstMatch.exists)
        shot("builder-preview")
        tap(button("Build weekly plan"))
        XCTAssertTrue(button("Save weekly plan").waitForExistence(timeout: 20))
        shot("weekly-preview")
    }
    func testCoachGuidedAnswer() {
        tap(button("Ask your training guide"))
        tap(button("What changed recently?"))
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'In the last 30 days'")).firstMatch.waitForExistence(timeout: 20))
        shot("coach-guided-answer")
    }
    func testIntervalPauseBackgroundResumeReset() {
        tap(navigation("Your progress"))
        tap(button("Interval timer"))
        tap(button("Start"))
        tap(button("Pause"))
        XCTAssertTrue(button("Resume").exists)
        XCUIDevice.shared.press(.home)
        app.activate()
        tap(button("Resume"))
        XCTAssertTrue(button("Pause").exists)
        tap(button("Reset"))
        XCTAssertTrue(button("Start").exists)
        shot("interval-reset-after-background")
    }
    func testAuthenticatedWorkoutAndCitationJourney() throws {
        guard let url = Bundle(for: Self.self).url(forResource: "native-qa", withExtension: "json") else { throw XCTSkip("Requires isolated local QA account fixture") }
        let data = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as! [String: String]
        tap(button("Open profile"))
        if !app.textFields["Email"].waitForExistence(timeout: 5) && !app.staticTexts[data["email"]!].exists {
            let previousQA = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH 'native-ui-' AND label ENDSWITH '@example.test'")).firstMatch
            XCTAssertTrue(previousQA.exists, "Refusing to modify a profile that is not this run's disposable QA account")
            guard previousQA.exists else { return }
            tap(button("Sign out"))
            XCTAssertTrue(app.textFields["Email"].waitForExistence(timeout: 20))
        }
        if app.textFields["Email"].exists {
            if button("Already have an account? Sign in").exists { tap(button("Already have an account? Sign in")) }
            app.textFields["Email"].tap(); app.textFields["Email"].typeText(data["email"]!)
            app.secureTextFields["Password"].tap(); app.secureTextFields["Password"].typeText(data["password"]!)
            tap(button("Sign in"))
            let permission = XCUIApplication(bundleIdentifier: "com.apple.springboard").alerts.firstMatch
            if permission.waitForExistence(timeout: 5) && permission.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] 'local network'")).firstMatch.exists {
                print("QA_LOCAL_NETWORK_PERMISSION_REQUESTED")
                let dismissed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: permission)
                XCTAssertEqual(XCTWaiter.wait(for: [dismissed], timeout: 120), .completed, "Local network permission awaits the device owner")
            }
            XCTAssertTrue(app.staticTexts["Training profiles"].waitForExistence(timeout: 30))
        }
        tap(navigation("Home"))
        tap(button("Build a workout"))
        tap(button("Build workout"))
        tap(app.buttons.matching(NSPredicate(format: "label BEGINSWITH[c] 'Swap '")).firstMatch)
        tap(button("Save to plans"))
        tap(navigation("Home"))
        if button("Continue workout").exists { tap(button("Continue workout")) } else { tap(button("Start workout")) }
        tap(app.switches.matching(NSPredicate(format: "label BEGINSWITH 'Complete set '")).firstMatch)
        tap(button("Finish workout"))
        tap(button("Save workout"))
        XCTAssertTrue(app.staticTexts["Workout log"].waitForExistence(timeout: 20))
        tap(navigation("Home"))
        tap(button("Ask your training guide"))
        tap(button("What changed recently?"))
        XCTAssertTrue(app.staticTexts["Source sessions"].waitForExistence(timeout: 20))
        tap(app.links.matching(NSPredicate(format: "label CONTAINS '35 min'")).firstMatch)
        XCTAssertTrue(app.staticTexts["Workout log"].waitForExistence(timeout: 20))
        shot("completed-workout-source-citation")
        tap(app.buttons.matching(NSPredicate(format: "label BEGINSWITH[c] 'Edit saved session '")).firstMatch)
        let reps = app.textFields["Exercise 1 set 1 reps"]
        tap(reps)
        let old = reps.value as? String ?? ""
        reps.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: old.count) + "11")
        if app.buttons["Done"].exists { app.buttons["Done"].tap() }
        tap(button("Review changes"))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'preserving its date, ID and original timing'")).firstMatch.waitForExistence(timeout: 20))
        tap(button("Save changes"))
        XCTAssertTrue(app.staticTexts["Workout log"].waitForExistence(timeout: 20))
        shot("saved-session-edit-with-original-identity")
    }
    func testExplicitModelDisabledGuidedMode() {
        tap(button("Ask your training guide"))
        let toggle = app.switches["Use on-device model"].exists ? app.switches["Use on-device model"] : app.checkBoxes["Use on-device model"]
        XCTAssertTrue(toggle.waitForExistence(timeout: 20))
        if (toggle.value as? String) != "0" { toggle.tap() }
        tap(button("What changed recently?"))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'Model disabled on this device'")).firstMatch.waitForExistence(timeout: 20))
        shot("model-disabled-guided-mode")
    }
    func testPhysicalUnsupportedModelFallback() throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Physical unsupported-model hardware required")
        #endif
        tap(button("Ask your training guide"))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'does not expose a supported local model'")).firstMatch.waitForExistence(timeout: 30))
        tap(button("What changed recently?"))
        XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'In the last 30 days'")).firstMatch.waitForExistence(timeout: 20))
        shot("physical-unsupported-model-guided-answer")
    }
    func testBuilderKeyboardAccess() throws {
        app.terminate()
        app.launchArguments.append("-SetsStrengthViewportProbe")
        app.launch()
        tap(button("Build a workout"))
        let field = app.textViews["Describe your workout"]
        tap(field)
        let previous = field.value as? String ?? ""
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: previous.count) + "35 minutes, upper body, dumbbells only, no bench")
        if app.buttons["Done"].exists { app.buttons["Done"].tap() }
        tap(button("Build workout"))
        XCTAssertTrue(button("Save to plans").waitForExistence(timeout: 20))
        shot("keyboard-builder-preview")
        let scale = app.staticTexts["ss-viewport-scale"]
        XCTAssertTrue(scale.waitForExistence(timeout: 5))
        let actualScale = try XCTUnwrap(Double(scale.label))
        XCTAssertEqual(actualScale, 1, accuracy: 0.05, "Keyboard focus must not leave the viewport zoomed and clipped")
    }
    func testCameraDenialKeepsPhotoImportReachable() throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Physical camera permission path required")
        #endif
        tap(navigation("Your progress"))
        tap(button("Open photos"))
        tap(button("Take progress photo"))
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let deny = springboard.alerts.buttons.matching(NSPredicate(format: "label CONTAINS[c] 'allow' AND label !=[c] 'Allow'")).firstMatch
        if deny.waitForExistence(timeout: 15) { deny.tap() }
        else { XCTFail("Camera permission-denial prompt was not presented; denial is unverified"); return }
        let cancel = app.buttons.matching(NSPredicate(format: "label ==[c] 'Cancel' OR label ==[c] 'Close'")).firstMatch
        if cancel.waitForExistence(timeout: 5) { cancel.tap() }
        XCTAssertTrue(button("Import photo").waitForExistence(timeout: 15))
        XCTAssertTrue(button("Import photo").isHittable, "Import must be tappable after leaving the denied camera picker")
        shot("camera-denial-import-alternative")
    }
    func testPhysicalAirplaneModeGuidedJourney() throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Physical wired iPad required for real radio isolation")
        #else
        let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
        settings.launch()
        let airplane = settings.switches["com.apple.settings.airplaneMode"].switches.firstMatch
        XCTAssertTrue(airplane.waitForExistence(timeout: 20))
        let originalAirplane = airplane.value as? String
        let wifiRow = settings.cells.matching(NSPredicate(format: "label BEGINSWITH 'Wi-Fi'")).firstMatch
        if wifiRow.exists { wifiRow.tap() } else { settings.buttons["com.apple.settings.wifi"].tap() }
        let wifi = settings.switches["Wi‑Fi"]
        XCTAssertTrue(wifi.waitForExistence(timeout: 15))
        let originalWifi = wifi.value as? String
        restoreRadios = {
            settings.activate()
            if airplane.exists && (airplane.value as? String) != originalAirplane { airplane.tap() }
            if wifi.exists && (wifi.value as? String) != originalWifi { wifi.tap() }
            XCTAssertEqual(airplane.value as? String, originalAirplane)
            XCTAssertEqual(wifi.value as? String, originalWifi)
            print("QA_RADIOS_RESTORED")
            self.app.activate()
        }
        defer { restoreRadios?(); restoreRadios = nil }
        if originalAirplane == "0" { airplane.tap() }
        if (wifi.value as? String) == "1" { wifi.tap() }
        XCTAssertEqual(airplane.value as? String, "1")
        XCTAssertEqual(wifi.value as? String, "0")
        app.activate()
        tap(navigation("Home"))
        if Bundle(for: Self.self).url(forResource: "native-qa", withExtension: "json") != nil {
            try testAuthenticatedWorkoutAndCitationJourney()
        } else {
            try testBuilderKeyboardAccess()
            tap(navigation("Home"))
            tap(button("Ask your training guide"))
            tap(button("What changed recently?"))
            XCTAssertTrue(app.staticTexts.matching(NSPredicate(format: "label CONTAINS 'In the last 30 days'")).firstMatch.waitForExistence(timeout: 20))
        }
        shot("physical-airplane-mode-guided-builder-coach")
        #endif
    }
    func testPreviouslyDeniedCameraCanReturnToImport() throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Physical camera recovery required")
        #else
        tap(navigation("Your progress"))
        tap(button("Open photos"))
        tap(button("Take progress photo"))
        let importButton = button("Import photo")
        for _ in 0..<3 {
            if importButton.exists && importButton.isHittable { break }
            let cancel = app.buttons.matching(NSPredicate(format: "label ==[c] 'Cancel' OR label ==[c] 'Close'")).firstMatch
            guard cancel.waitForExistence(timeout: 10) else { print(app.debugDescription); XCTFail("Camera picker has no accessible exit"); return }
            cancel.tap()
        }
        XCTAssertTrue(importButton.waitForExistence(timeout: 15))
        XCTAssertTrue(importButton.isHittable)
        shot("denied-camera-returned-to-import")
        #endif
    }
    func testLocalPhotoImportCompareDelete() throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Requires synthetic image fixtures in the physical QA app Documents folder")
        #else
        tap(navigation("Your progress"))
        tap(button("Open photos"))
        func importFixture(_ name: String) {
            tap(button("Import photo"))
            if button("Choose File").waitForExistence(timeout: 5) { tap(button("Choose File")) }
            let file = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", name)).firstMatch
            if !file.waitForExistence(timeout: 5) {
                if app.staticTexts["On My iPad"].exists { tap(app.staticTexts["On My iPad"].firstMatch) }
                let folder = app.staticTexts["Sets & Strength QA"].firstMatch
                let files = app.collectionViews["File View"]
                for _ in 0..<8 { if folder.exists { break }; files.swipeUp() }
                tap(folder)
            }
            let cell = app.cells.matching(NSPredicate(format: "identifier BEGINSWITH %@", name + ",")).firstMatch
            if cell.exists {
                tap(cell)
                let dismissed = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: cell)
                if XCTWaiter.wait(for: [dismissed], timeout: 3) != .completed && cell.exists && cell.isHittable { cell.doubleTap() }
            } else { tap(file) }
        }
        importFixture("qa-front-a")
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Delete front photo'")).firstMatch.waitForExistence(timeout: 20))
        tap(app.otherElements["Date"].firstMatch)
        let day = Calendar.current.date(byAdding: .day, value: -1, to: Date())!
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US"); f.dateFormat = "EEEE, MMMM d"
        let yesterday = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", f.string(from: day))).firstMatch
        if !yesterday.waitForExistence(timeout: 10) { print(app.debugDescription) }
        tap(yesterday)
        if app.buttons["Done"].exists { app.buttons["Done"].tap() }
        importFixture("qa-front-b")
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Delete front photo'")).count, 2)
        tap(app.otherElements["Compare same-pose dates"].firstMatch)
        f.dateFormat = "yyyy-MM-dd"
        let dates = "\(f.string(from: day)) → \(f.string(from: Date()))"
        if app.pickerWheels.firstMatch.exists { app.pickerWheels.firstMatch.adjust(toPickerWheelValue: dates) }
        else { tap(app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", dates)).firstMatch) }
        if app.buttons["Done"].exists { app.buttons["Done"].tap() }
        XCTAssertGreaterThanOrEqual(app.images.matching(NSPredicate(format: "label BEGINSWITH 'front progress photo'")).count, 4)
        shot("physical-local-same-pose-comparison")
        for _ in 0..<2 {
            tap(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Delete front photo'")).firstMatch)
            tap(app.alerts.buttons.matching(NSPredicate(format: "label ==[c] 'Ok'")).firstMatch)
        }
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Delete front photo'")).count, 0)
        shot("physical-photo-fixtures-deleted")
        #endif
    }
    func testDeleteSyntheticPhotoFixtures() throws {
        #if targetEnvironment(simulator)
        throw XCTSkip("Physical QA photo fixtures required")
        #else
        tap(navigation("Your progress"))
        tap(button("Open photos"))
        let photos = app.buttons.matching(NSPredicate(format: "label BEGINSWITH 'Delete front photo'"))
        XCTAssertEqual(photos.count, 2, "Expected only the two isolated QA photo fixtures")
        for _ in 0..<2 {
            tap(photos.firstMatch)
            tap(app.alerts.buttons.matching(NSPredicate(format: "label ==[c] 'Ok'")).firstMatch)
        }
        XCTAssertEqual(photos.count, 0)
        shot("physical-qa-photo-fixtures-deleted")
        #endif
    }
}
