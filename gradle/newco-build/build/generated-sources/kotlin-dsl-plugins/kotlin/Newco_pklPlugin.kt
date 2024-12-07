/**
 * Precompiled [newco.pkl.gradle.kts][Newco_pkl_gradle] script plugin.
 *
 * @see Newco_pkl_gradle
 */
public
class Newco_pklPlugin : org.gradle.api.Plugin<org.gradle.api.Project> {
    override fun apply(target: org.gradle.api.Project) {
        try {
            Class
                .forName("Newco_pkl_gradle")
                .getDeclaredConstructor(org.gradle.api.Project::class.java, org.gradle.api.Project::class.java)
                .newInstance(target, target)
        } catch (e: java.lang.reflect.InvocationTargetException) {
            throw e.targetException
        }
    }
}
