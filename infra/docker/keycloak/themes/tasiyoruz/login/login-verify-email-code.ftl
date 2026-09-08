<#--
  E-posta doğrulama kodu formu.

  Temanın geri kalanı yalnızca CSS; bu dosya bir istisna, çünkü Keycloak'ta
  karşılığı olmayan yeni bir ekran. Yerleşik bir şablonu EZMİYOR, yenisini
  ekliyor — yükseltmede kırılma riski yalnızca registrationLayout makrosuyla
  sınırlı, o da temanın tamamının zaten bağlı olduğu arayüz.
-->
<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=true; section>
    <#if section = "header">
        ${msg("karincaVerifyCodeTitle")}
    <#elseif section = "form">
        <form id="kc-verify-code-form" class="${properties.kcFormClass!}" action="${url.loginAction}" method="post">

            <p class="karinca-verify-lead">
                ${msg("karincaVerifyCodeLead")}
                <strong class="karinca-verify-email">${(karincaEmail!"")}</strong>
            </p>

            <label class="karinca-code-label" for="code">${msg("karincaVerifyCodeLabel")}</label>
            <input id="code"
                   name="code"
                   class="karinca-code-input"
                   type="text"
                   inputmode="numeric"
                   pattern="[0-9]*"
                   maxlength="6"
                   autocomplete="one-time-code"
                   autofocus
                   placeholder="000000"
                   aria-describedby="karinca-code-hint"
                   required />
            <p id="karinca-code-hint" class="karinca-code-hint">${msg("karincaVerifyCodeHint")}</p>

            <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}"
                   type="submit" value="${msg("karincaVerifyCodeSubmit")}" />

            <div class="karinca-resend-row">
                <span>${msg("karincaVerifyCodeMissing")}</span>
                <button type="submit" name="resend" value="1" class="karinca-resend-button">
                    ${msg("karincaVerifyCodeResend")}
                </button>
            </div>
        </form>

        <script>
            // Yapıştırılan koddaki boşluk ve tireleri temizler; kullanıcı postadan
            // "123 456" kopyaladığında form geçersiz sayılmasın.
            (function () {
                var alan = document.getElementById("code");
                if (!alan) return;
                alan.addEventListener("input", function () {
                    var temiz = alan.value.replace(/\D/g, "").slice(0, 6);
                    if (alan.value !== temiz) alan.value = temiz;
                });
            })();
        </script>
    </#if>
</@layout.registrationLayout>
