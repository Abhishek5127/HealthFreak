import Foundation
import CoreMotion
import ExpoModulesCore

public class HealthfreakStepCounterModule: Module {
  private let pedometer = CMPedometer()

  public func definition() -> ModuleDefinition {
    Name("HealthfreakStepCounter")

    Events("onStepCountChange")

    AsyncFunction("isSensorAvailable") { () -> Bool in
      return CMPedometer.isStepCountingAvailable()
    }

    AsyncFunction("getTodaySteps") { (promise: Promise) in
      guard CMPedometer.isStepCountingAvailable() else {
        promise.resolve(0.0)
        return
      }

      let calendar = Calendar.current
      let startOfDay = calendar.startOfDay(for: Date())
      let now = Date()

      self.pedometer.queryPedometerData(from: startOfDay, to: now) { data, error in
        if let error = error {
          promise.reject("E_PEDOMETER", error.localizedDescription)
          return
        }
        let steps = data?.numberOfSteps.doubleValue ?? 0.0
        promise.resolve(steps)
      }
    }

    AsyncFunction("startBackgroundService") { () -> Bool in
      // iOS tracks steps automatically at the coprocessor level via CMPedometer
      return true
    }

    AsyncFunction("stopBackgroundService") { () -> Bool in
      return true
    }

    AsyncFunction("isBackgroundServiceRunning") { () -> Bool in
      return CMPedometer.isStepCountingAvailable()
    }

    AsyncFunction("setDailyStepGoal") { (_: Int) in
      // No-op on iOS
    }

    AsyncFunction("resetTodaySteps") { (promise: Promise) in
      promise.resolve(nil)
    }
  }
}

