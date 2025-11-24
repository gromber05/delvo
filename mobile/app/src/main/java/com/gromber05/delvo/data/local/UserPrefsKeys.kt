package com.gromber05.delvo.data.local

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore

val Context.userDataStore by preferencesDataStore(name = "user_prefs")

object UserPrefsKeys{
    val UID = stringPreferencesKey("uid")
    val EMAIL = stringPreferencesKey("email")
    val USERNAME = stringPreferencesKey("username")
    val DOB = stringPreferencesKey("dob")
    val ISADMIN = booleanPreferencesKey("isadmin")
}
