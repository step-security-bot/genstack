plugins {
    id("com.gradle.enterprise") version("3.16.2")
    id("com.gradle.common-custom-user-data-gradle-plugin") version "2.0.2"
}

includeBuild("packages/config")
includeBuild("packages/protocol")
includeBuild("packages/sdk")

rootProject.name = "genstack"

gradleEnterprise {
    buildScan {
        termsOfServiceUrl = "https://gradle.com/help/legal-terms-of-use"
        termsOfServiceAgree = "yes"
    }
}
