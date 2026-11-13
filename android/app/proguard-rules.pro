# androidbrowserhelper turns some of its own components on and off by class name
# (for example ManageDataLauncherActivity), so its classes keep their names.
-keepnames class com.google.androidbrowserhelper.** { *; }
