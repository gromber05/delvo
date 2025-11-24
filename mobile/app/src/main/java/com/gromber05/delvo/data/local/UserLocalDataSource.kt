package com.gromber05.delvo.data.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.emptyPreferences
import com.gromber05.delvo.domain.datasource.IUserLocalDataSource
import com.gromber05.delvo.domain.model.SessionUser
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import java.io.IOException
import javax.inject.Inject

class UserLocalDataSource @Inject constructor(
    @ApplicationContext private val context: Context
) : IUserLocalDataSource {

    override suspend fun saveUser(user: SessionUser) {
        context.userDataStore.edit { prefs ->
            prefs[UserPrefsKeys.UID] = user.uid
            prefs[UserPrefsKeys.EMAIL] = user.email
            prefs[UserPrefsKeys.USERNAME] = user.username
            prefs[UserPrefsKeys.DOB] = user.dob
            prefs[UserPrefsKeys.ISADMIN] = user.isAdmin
        }
    }

    override fun getUser(): Flow<SessionUser?> =
        context.userDataStore.data
            .catch { e ->
                if (e is IOException) {
                    emit(emptyPreferences())
                } else {
                    throw e
                }
            }
            .map { prefs ->
                val uid = prefs[UserPrefsKeys.UID] ?: return@map null
                val email = prefs[UserPrefsKeys.EMAIL] ?: ""
                val username = prefs[UserPrefsKeys.USERNAME] ?: ""
                val dob = prefs[UserPrefsKeys.DOB] ?: ""
                val isAdmin = prefs[UserPrefsKeys.ISADMIN] ?: false
                SessionUser(uid, email, username, dob, isAdmin)
            }

    override suspend fun clearUser() {
        context.userDataStore.edit { it.clear() }
    }
}
