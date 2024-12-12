@file:Suppress("ConstPropertyName", "unused", "MemberVisibilityCanBePrivate")

import kotlin.io.path.absolutePathString
import org.gradle.api.JavaVersion
import org.gradle.api.Project
import org.gradle.api.artifacts.Configuration
import org.gradle.jvm.toolchain.JavaLanguageVersion
import org.gradle.jvm.toolchain.JvmVendorSpec
import org.gradle.kotlin.dsl.*
import org.jetbrains.kotlin.gradle.dsl.JsModuleKind
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.targets.js.dsl.KotlinJsTargetDsl
import org.jetbrains.kotlin.gradle.targets.jvm.KotlinJvmTarget

/** Build Constants */
public object GenstackBuild {
  public const val androidCompileTarget: Int = 34
  public const val androidMinSdk: Int = 30
  public const val jvmToolchain: Int = 23
  public const val jvmToolchainAndroid: Int = 21
  public const val jvmBytecodeTarget: Int = 21
  public const val jsTarget: String = "es2015"
  public const val jsClasses: Boolean = true
  public const val kotlinSdk: String = "2.1.0"
  public const val androidNamespacePrefix: String = "dev.newco.genstack"
  public const val mavenGroup: String = "dev.newco"
  public const val wasm: Boolean = true
  public const val wasi: Boolean = false
  public const val nodejs: Boolean = true
  public const val typescript: Boolean = true
  public const val enableiOS: Boolean = true
  public const val enableArm64: Boolean = true
  public const val enableX64: Boolean = false
  public const val dependencyLocking: Boolean = true
  public const val dependencyVerification: Boolean = true

  public val androidToolchainVendor: JvmVendorSpec = JvmVendorSpec.AZUL
  public val androidToolchainVersion: JavaLanguageVersion =
      JavaLanguageVersion.of(jvmToolchainAndroid)
  public val desktopToolchainVendor: JvmVendorSpec = JvmVendorSpec.matching("Oracle")
  public val desktopToolchainVerion: JavaLanguageVersion = JavaLanguageVersion.of(jvmToolchain)
  public val jvmTarget: JvmTarget = JvmTarget.fromTarget(jvmBytecodeTarget.toString())
  public val javaVersion: JavaVersion = JavaVersion.toVersion(jvmBytecodeTarget)
  public val jsModules: JsModuleKind = JsModuleKind.MODULE_ES
  public val javaLanguageVersion: JavaLanguageVersion = JavaLanguageVersion.of(jvmBytecodeTarget)
  public val javaToolchainVersion: JavaLanguageVersion = JavaLanguageVersion.of(jvmToolchain)
}

// Alias for build constants.
private val constants = GenstackBuild

// Indicates whether we are running in CI.
private val isCI = System.getenv("GITHUB_ACTIONS") != null || System.getenv("CI") != null

/**
 * Build a consistent Android namespace string.
 *
 * @param postfix The postfix to append to the namespace.
 * @return The full namespace string.
 */
public fun androidNamespace(postfix: String): String =
    "${constants.androidNamespacePrefix}.${postfix}"

/**
 * Configure dependencies.
 *
 * Configures build features like dependency verification and locking.
 */
public fun Project.configureDependencies(enabledConfigurations: List<Configuration> = emptyList()) {
  val isRelease = findProperty("release") != null && properties["release"] != "false"
  enabledConfigurations.forEach {
    if (constants.dependencyLocking && (!isCI || isRelease)) {
      it.apply { resolutionStrategy.activateDependencyLocking() }
    }
  }

  tasks.register("resolveAndLockAll") {
    notCompatibleWithConfigurationCache("Filters configurations at execution time")

    doFirst {
      require(gradle.startParameter.isWriteDependencyLocks) {
        "$path must be run from the command line with the `--write-locks` flag"
      }
    }

    doLast {
      configurations
          .filter {
            // Add any custom filtering on the configurations to be resolved
            it.isCanBeResolved && it in enabledConfigurations
          }
          .forEach { it.resolve() }
    }
  }

  project.configurations.all {
    if ("detached" !in name) {
      if (constants.dependencyVerification) {
        resolutionStrategy.enableDependencyVerification()
      }
    }
  }
}

/** Configure a JS target for Kotlin. */
public fun KotlinJsTargetDsl.configureJsTarget(
    web: Boolean = true,
    binary: Boolean = true,
    patchEsm: Boolean = false,
    node: Boolean = constants.nodejs,
    typescript: Boolean = constants.typescript,
) {
  // enable different platforms
  if (node) {
    nodejs()
  }
  if (web) {
    browser {
      webpackTask {
        // Nothing at this time.
      }
    }
  }
  if (typescript) {
    generateTypeScriptDefinitions()
  }

  // select module mode
  if (constants.jsModules == JsModuleKind.MODULE_ES) {
    useEsModules()
  } else {
    useCommonJs()
  }

  // set compiler options
  compilerOptions {
    moduleKind = constants.jsModules
    target = constants.jsTarget
    useEsClasses = constants.jsClasses
  }

  // patch to enable ESM
  if (patchEsm) compilations.getByName("main").packageJson { customField("type", "module") }

  if (binary) {
    binaries.executable()
  }
}

/** Configure a JVM target for Kotlin. */
public fun KotlinJvmTarget.configureJvmTarget() {
  compilerOptions {
    jvmTarget = constants.jvmTarget
    javaParameters = true
  }
}

/** Configure a pure JVM/native GraalVM project. */
public fun Project.configureJvmProject() {
  project.configureDependencies(
      listOf(
              "compileClasspath",
              "runtimeClasspath",
              "nativeImageClasspath",
          )
          .map { project.configurations.named(it).get() })
}

/** Configure a KMP project. */
public fun Project.configureKmpProject() {
  project.configureDependencies(
      listOf(
              "commonMainImplementation",
              "androidMainImplementation",
              "jvmMainImplementation",
              "jvmCompileClasspath",
              "jsMainImplementation",
              "jsCompileClasspath",
              "wasmJsMainImplementation",
          )
          .map { project.configurations.named(it).get() })
}

/**
 * Build a Maven coordinate string for a Genstack library.
 *
 * @param name Name of the library to include in the coordinate.
 * @param version Version of the library to declare; optional. If unspecified, no version is
 *   enclosed.
 * @return String Maven coordinate.
 */
public fun Project.genstackMaven(name: String, version: String? = null): String =
    "${constants.mavenGroup}:$name${if (version != null) ":$version" else ""}"

// Configures the Nexus Publishing plugin for Sonatype.
private fun Project.configureNexus() {
  configure<io.github.gradlenexus.publishplugin.NexusPublishExtension>() {
    repositories {
      sonatype {
        nexusUrl.set(uri("https://s01.oss.sonatype.org/service/local/"))
        snapshotRepositoryUrl.set(
            uri("https://s01.oss.sonatype.org/content/repositories/snapshots/"))
      }
    }
  }
}

// Configure the built-in Gradle publishing extension with target repositories.
private fun Project.publishingRepositories() {
  configureNexus()
  configure<org.gradle.api.publish.PublishingExtension>() {
    repositories {
      maven {
        name = "stage"
        url =
            uri(
                "file://${rootProject.layout.buildDirectory.dir("repo").get().asFile.toPath().absolutePathString()}")
      }
    }
  }
}

// Artifact prefix.
private const val artifactPrefix = "genstack"

// Transform an artifact name to include the expected prefix.
private fun transformArtifactName(
    original: String,
    name: String,
    prefix: String? = artifactPrefix
): String {
  // the artifact name might be:
  // `something` or
  // `something-{js,jvm...}`
  //
  // so, we need to transform it to `genstack-something` (the `prefix`), but honoring the postfix:
  // `genstack-something` or
  // `genstack-something-{js,jvm...}`
  val postfix = original.removePrefix(name)
  return if (prefix != null) {
    "$prefix-$name$postfix"
  } else {
    name // no prefix, nothing to transform
  }
}

/**
 * Configure a publishing target for a KMP library.
 *
 * Depending on provided settings, multiple repositories will be configured:
 * - Maven Central, via the Nexus publishing plugin
 * - Local and staging repositories, via Gradle's built-in publishing plugin
 *
 * KMP libraries generate additional Gradle metadata for multiplatform use.
 *
 * @param artifactName Name of the published version of the library; for example, if the library is
 *   known internally as `core`, this might be transformed to `genstack-core`. This name
 *   artifactDescription always just be `core`.
 * @param description Description of the library to include in the POM.
 * @param pomCallback Callback to configure the POM; optional.
 */
public fun Project.publishableKmpLib(
    artifactName: String = project.name,
    artifactDescription: String? = null,
    pomCallback: (org.gradle.api.publish.maven.MavenPom.() -> Unit)? = null,
) {
  // configure dist repositories
  publishingRepositories()

  // configure publishing
  configure<org.gradle.api.publish.PublishingExtension>() {
    publications {
      withType<org.gradle.api.publish.maven.MavenPublication>().all {
        pom {
          description.set(artifactDescription)
          pomCallback?.invoke(this)
        }
      }
    }
  }
}

/**
 * Configure a publishing target for a KMP library.
 *
 * Depending on provided settings, multiple repositories will be configured:
 * - Maven Central, via the Nexus publishing plugin
 * - Local and staging repositories, via Gradle's built-in publishing plugin
 *
 * @param name Name of the published version of the library; for example, if the library is known
 *   internally as `core`, this might be transformed to `genstack-core`. This name should always
 *   just be `core`.
 * @param description Description of the library to include in the POM.
 * @param pomCallback Callback to configure the POM; optional.
 */
public fun Project.publishableJvmLib(
    artifactName: String = project.name,
    artifactDescription: String? = null,
    pomCallback: (org.gradle.api.publish.maven.MavenPom.() -> Unit)? = null,
) {
  // configure dist repositories
  publishingRepositories()

  // configure publishing
  configure<org.gradle.api.publish.PublishingExtension>() {
    publications {
      create<org.gradle.api.publish.maven.MavenPublication>("maven") {
        groupId = constants.mavenGroup
        artifactId = transformArtifactName(name, artifactName)
        version = project.version.toString()
        artifact(tasks["jar"])

        pom {
          name.set(artifactName)
          description.set(artifactDescription)
          pomCallback?.invoke(this)
        }
      }
    }
  }
}
