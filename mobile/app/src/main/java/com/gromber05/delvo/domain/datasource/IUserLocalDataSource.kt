package com.gromber05.delvo.domain.datasource

import com.gromber05.delvo.domain.model.SessionUser
import kotlinx.coroutines.flow.Flow

interface IUserLocalDataSource {
    suspend fun saveUser(user: SessionUser)
    fun getUser(): Flow<SessionUser?>
    suspend fun clearUser()
}
