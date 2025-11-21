package com.gromber05.delvo.data.repository

import com.gromber05.delvo.data.remote.RetrofitClient
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.tasks.await

class UserRepository(
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
) {

    suspend fun getIsAdmin(): Boolean {
        val user = auth.currentUser ?: return false

        val idToken = user.getIdToken(true).await().token
            ?: return false

        val response = RetrofitClient.api.getMyInfo("Bearer $idToken")
        return response.isAdmin
    }
}
