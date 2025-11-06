package com.gromber05.delvo.utils

import android.content.Context

class SettingsManager(context: Context) {
    private val prefs = context.getSharedPreferences("UserConstant", Context.MODE_PRIVATE)

    companion object {
        const val IS_LOGGED_IN_KEY = "is_user_logged_in"
    }

    fun setLoggedIn(isLoggedIn: Boolean) {
        prefs.edit().putBoolean(IS_LOGGED_IN_KEY, isLoggedIn).apply()
    }

    fun isLoggedIn(): Boolean {
        return prefs.getBoolean(IS_LOGGED_IN_KEY, false)
    }
}