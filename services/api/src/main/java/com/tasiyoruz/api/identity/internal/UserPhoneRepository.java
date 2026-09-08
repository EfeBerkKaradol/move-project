package com.tasiyoruz.api.identity.internal;

import com.tasiyoruz.api.identity.domain.UserPhone;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

interface UserPhoneRepository extends JpaRepository<UserPhone, String> {
    Optional<UserPhone> findByPhone(String phone);
}
