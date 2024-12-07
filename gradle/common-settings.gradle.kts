@file:Suppress("UnstableApiUsage", "DSL_SCOPE_VIOLATION", "UNUSED_PARAMETER")

import java.io.File
import java.io.FileInputStream
import java.util.*

fun loadCommonProperties(settings: Settings, relativePathToRoot: String) {
  settings.apply {
    Properties().apply {
      //load(FileInputStream(File(rootDir, "common.properties")))
    }.let { extraProps ->
      extraProps.forEach { (k, v) ->
        extra[k as String] = v
      }
    }
  }
}

public fun pathFromRoot(relativeToRoot: String, path: String): String {
  // combine `relativeToRoot` and `path` into a resolved relative path
  return File("$relativeToRoot/$path").path
}

public fun genstack(
  settings: Settings,
  root: String,
  block: Settings.() -> Unit,
) {
  loadCommonProperties(settings, root)

  pluginManagement {
    repositories {
      gradlePluginPortal()
      mavenCentral()
      google()
    }
  }

  dependencyResolutionManagement {
    repositories {
      maven {
        name = "buf"
        url = uri("https://buf.build/gen/maven")
        content {
          includeGroup("build.buf.gen")
        }
      }
      gradlePluginPortal()
      mavenCentral()
      google()
    }

    versionCatalogs {
      create("libs") {
        from(files(pathFromRoot(root, "gradle/libs.versions.toml")))
      }
      create("kotlinx") {
        from(files(pathFromRoot(root, "gradle/kotlinx.versions.toml")))
      }
      create("npm") {
        from(files(pathFromRoot(root, "gradle/npm.versions.toml")))
      }
      create("protocol") {
        from(files(pathFromRoot(root, "gradle/protocol.versions.toml")))
      }
      create("gvm") {
        from(files(pathFromRoot(root, "gradle/graalvm.versions.toml")))
      }
      create("genstack") {
        from(files(pathFromRoot(root, "gradle/genstack.versions.toml")))
      }
      create("kjs") {
        val kotlinxWrappersVersion: String by settings
        from("org.jetbrains.kotlin-wrappers:kotlin-wrappers-catalog:$kotlinxWrappersVersion")
      }
      create("elide") {
        val elideVersion: String by settings
        from("dev.elide:elide-bom:$elideVersion")
      }
      create("androidx") {
        val androidxVersion: String by settings
        from("androidx.gradle:gradle-version-catalog:$androidxVersion")
      }
    }
  }

  block()
}

extra["loadCommonProperties"] = ::loadCommonProperties
extra["genstack"] = ::genstack
