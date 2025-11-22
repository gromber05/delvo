package com.gromber05.delvo.repository

import com.gromber05.delvo.domain.AppUser
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface UserRepository : JpaRepository<AppUser, Long> {
    fun findByUid(uid: String): AppUser?
}