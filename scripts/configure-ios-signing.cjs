const fs = require('node:fs');
const xcode = require('xcode');
const file = 'ios/App/App.xcodeproj/project.pbxproj';
const p = xcode.project(file);
p.parseSync();
const objects = p.hash.project.objects;
for (const [name, profile] of [['App', process.env.PROFILE_NAME], ['RimbaWidgets', process.env.WIDGET_PROFILE_NAME]]) {
  if (!profile || !process.env.APPLE_TEAM_ID || !/^\d+$/.test(process.env.BUILD_NUMBER || '')) throw Error(`Missing signing configuration for ${name}`);
  const target = Object.values(objects.PBXNativeTarget).find(t => t && typeof t === 'object' && t.name.replaceAll('"', '') === name);
  if (!target) throw Error(`Missing native target ${name}`);
  for (const ref of objects.XCConfigurationList[target.buildConfigurationList].buildConfigurations) {
    const config = objects.XCBuildConfiguration[ref.value];
    config.buildSettings.CURRENT_PROJECT_VERSION = process.env.BUILD_NUMBER;
    if (config.name !== 'Release') continue;
    Object.assign(config.buildSettings, {
      CODE_SIGN_STYLE: 'Manual', DEVELOPMENT_TEAM: process.env.APPLE_TEAM_ID,
      PROVISIONING_PROFILE_SPECIFIER: JSON.stringify(profile),
      '"CODE_SIGN_IDENTITY[sdk=iphoneos*]"': '"Apple Distribution"',
    });
  }
}
fs.writeFileSync(file, p.writeSync());
console.log('Configured App and RimbaWidgets release signing and matching build numbers.');
