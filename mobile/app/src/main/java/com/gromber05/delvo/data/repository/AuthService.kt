package com.gromber05.delvo.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.gromber05.delvo.data.local.UserLocalDataSource
import com.gromber05.delvo.data.remote.ApiService
import com.gromber05.delvo.domain.model.SessionUser
import com.gromber05.delvo.domain.model.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

class AuthService @Inject constructor(
    private val firebaseAuth: FirebaseAuth,
    private val apiService: ApiService,
    private val userLocalDataSource: UserLocalDataSource
) : AuthRepository {

    override fun isLoggedIn(): Boolean = firebaseAuth.currentUser != null

    override suspend fun login(email: String, password: String): Result<Unit> {
        return try {
            firebaseAuth.signInWithEmailAndPassword(email.trim(), password).await()
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun register(user: User): Result<Unit> {
        return try {
            firebaseAuth.createUserWithEmailAndPassword(user.email, user.password).await()

            val currentUser = firebaseAuth.currentUser
                ?: return Result.failure(IllegalStateException("Usuario no disponible tras el registro"))

            val idToken = currentUser.getIdToken(true).await().token
                ?: return Result.failure(IllegalStateException("No se pudo obtener el token"))

            val safeUser = user.copy(password = "")
            val response = apiService.registerUser(
                authorization = "Bearer $idToken",
                user = safeUser
            )

            if (response.isSuccessful) {
                Result.success(Unit)
            } else {
                Result.failure(Exception("Error backend: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun logout() {
        userLocalDataSource.clearUser()
        firebaseAuth.signOut()
    }

    override fun getCachedUser(): Flow<SessionUser?> =
        userLocalDataSource.getUser()

}
