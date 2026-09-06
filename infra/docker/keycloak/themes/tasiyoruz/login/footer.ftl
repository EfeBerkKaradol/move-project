<#macro content>
<#--
  Giriş kutusunun altındaki alan (base/login/footer.ftl). Keycloak bu dosyayı
  özelleştirme için boş bırakıyor;
  büyük template.ftl'i kopyalamadan ekleme yapmanın tek temiz yolu bu — kopyalansaydı
  her Keycloak sürümünde elle senkron tutmak gerekirdi.

  Bağlantı client.baseUrl'den geliyor (realm'de tasiyoruz-web için tanımlı). Sabit
  yazılsaydı üretimde localhost'a düşerdi.
-->
  <#if client?? && client.baseUrl?has_content>
    <div class="ts-back-home">
      <a id="ts-back-to-app" href="${client.baseUrl}">
        <span aria-hidden="true">&larr;</span> ${kcSanitize(msg("backToApplication"))?no_esc}
      </a>
    </div>
  </#if>
</#macro>
