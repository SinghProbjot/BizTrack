const { withProjectBuildGradle } = require("@expo/config-plugins");

/**
 * Fixes the CMake build order: ensures worklets' buildCMakeRelWithDebInfo
 * runs before reanimated's, now that both use RelWithDebInfo mode.
 */
module.exports = function withWorkletsGradleFix(config) {
  return withProjectBuildGradle(config, (config) => {
    const tag = "// [workletsGradleFix]";
    if (config.modResults.contents.includes(tag)) return config;

    const fix = `
${tag}
gradle.projectsEvaluated {
    def workletsProj = rootProject.findProject(":react-native-worklets")
    def reaProj = rootProject.findProject(":react-native-reanimated")
    if (workletsProj != null && reaProj != null) {
        // Force all lazy tasks to be registered before iterating
        workletsProj.tasks.configureEach {}
        reaProj.tasks.each { reaTask ->
            if (reaTask.name.startsWith("buildCMakeRelWithDebInfo")) {
                def m = reaTask.name =~ /buildCMakeRelWithDebInfo\\[([^\\]]+)\\]/
                if (m.find()) {
                    def abi = m.group(1)
                    workletsProj.tasks.each { wt ->
                        if (wt.name == "buildCMakeRelWithDebInfo[" + abi + "][worklets]" ||
                            wt.name == "buildCMakeRelease[" + abi + "][worklets]") {
                            reaTask.dependsOn(wt)
                        }
                    }
                }
            }
        }
    }
}
`;

    config.modResults.contents += fix;
    return config;
  });
};
