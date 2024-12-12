dependencyLocking {
    lockAllConfigurations()
}

val isRelease = "release" in properties && properties["release"] != "false"

fun Task.runForAll(name: String) {
    dependsOn(listOf(
        gradle.includedBuild("config"),
        gradle.includedBuild("protocol"),
        gradle.includedBuild("sdk"),
    ).map {
        it.task(name)
    })
}

val build by tasks.registering { runForAll(":build") }
val clean by tasks.registering { runForAll(":clean") }
val test by tasks.registering { runForAll(":test") }
val check by tasks.registering { runForAll(":check") }
val outdated by tasks.registering { runForAll(":dependencyUpdates") }
val relock by tasks.registering { runForAll(":resolveAndLockAll") }
