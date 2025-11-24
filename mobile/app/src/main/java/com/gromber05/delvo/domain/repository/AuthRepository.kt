package com.gromber05.delvo.domain.repository

import com.gromber05.delvo.domain.model.SessionUser
import com.gromber05.delvo.domain.model.User
import kotlinx.coroutines.flow.Flow

interface AuthRepository {
    suspend fun login(email: String, password: String): Result<Unit>
    suspend fun register(user: User): Result<Unit>
    suspend fun logout()
    fun isLoggedIn(): Boolean
    fun getCachedUser(): Flow<SessionUser?>
}