@file:Suppress("UnstableApiUsage", "DSL_SCOPE_VIOLATION", "UNCHECKED_CAST")

pluginManagement {
  includeBuild("../../gradle/newco-build")
}

plugins {
  id("com.gradle.enterprise") version("3.16.2")
  id("com.gradle.common-custom-user-data-gradle-plugin") version "2.0.2"
}


gradleEnterprise {
    buildScan {
        termsOfServiceUrl = "https://gradle.com/help/legal-terms-of-use"
        termsOfServiceAgree = "yes"
    }
}

rootProject.name = "protocol"

includeBuild("../config")
