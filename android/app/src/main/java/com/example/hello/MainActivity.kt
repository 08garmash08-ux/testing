package com.example.hello

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Bundle

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val roblox = packageManager.getLaunchIntentForPackage(ROBLOX_PACKAGE)
        if (roblox != null) {
            startActivity(roblox)
        } else {
            // Roblox isn't installed, so open its store page instead.
            try {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$ROBLOX_PACKAGE")))
            } catch (e: ActivityNotFoundException) {
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$ROBLOX_PACKAGE")))
            }
        }
        finish()
    }

    private companion object {
        const val ROBLOX_PACKAGE = "com.roblox.client"
    }
}
