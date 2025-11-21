package com.gromber05.delvo.repository

import com.gromber05.delvo.domain.UserEntity
import org.springframework.data.jpa.repository.JpaRepository

interface UserRepository : JpaRepository<UserEntity, String> {
    fun findByUid(uid: String): UserEntity?
}
