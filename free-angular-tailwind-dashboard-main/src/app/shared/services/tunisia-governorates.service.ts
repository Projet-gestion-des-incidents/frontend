// tunisia-governorates.service.ts - Version avec priorité égale
import { Injectable } from '@angular/core';

export interface Governorate {
  name: string;
  code: string;
  region: 'Nord' | 'Centre' | 'Sud';
  keywords: string[];
  color: string;
}

@Injectable({
  providedIn: 'root',
})
export class TunisiaGovernoratesService {
  
  private governorates: Governorate[] = [
    // NORD
    { name: 'Tunis', code: 'TN-11', region: 'Nord', color: '#10B981', keywords: ['tunis', 'carthage', 'marsa', 'mutuelleville', 'el menzah', 'belvédère', 'bab saadoun', 'bab el khadhra', 'el omrane', 'ezzahra', 'gouvernorat tunis'] },
    { name: 'Ariana', code: 'TN-12', region: 'Nord', color: '#3B82F6', keywords: ['ariana', 'raoued', 'soukra', 'kalâat el-andalous', 'sidi thabet', 'borj louzir', 'gouvernorat ariana'] },
    { name: 'Ben Arous', code: 'TN-13', region: 'Nord', color: '#F59E0B', keywords: ['ben arous', 'el mourouj', 'mohamedia', 'fouchana', 'radès', 'megrine', 'mornag', 'hamam lif', 'gouvernorat ben arous'] },
    { name: 'Manouba', code: 'TN-14', region: 'Nord', color: '#8B5CF6', keywords: ['manouba', 'douar hicher', 'oued ellil', 'mornaguia', 'borj el amri', 'den den', 'tebourba', 'gouvernorat manouba'] },
    { name: 'Nabeul', code: 'TN-21', region: 'Nord', color: '#EC4899', keywords: ['nabeul', 'dar chaabane', 'hammamet', 'kelibia', 'korba', 'menzel temime', 'beni khiar', 'el haouaria', 'grombalia', 'takelsa', 'délégation nabeul', 'gouvernorat nabeul'] },
    { name: 'Zaghouan', code: 'TN-22', region: 'Nord', color: '#4F46E5', keywords: ['zaghouan', 'fahs', 'bir mcherga', 'nadhour', 'zriba', 'el fahs', 'gouvernorat zaghouan'] },
    { name: 'Bizerte', code: 'TN-23', region: 'Nord', color: '#14B8A6', keywords: ['bizerte', 'mateur', 'menzel bourguiba', 'tinja', 'sejnane', 'ras jebel', 'ghezala', 'utique', 'gouvernorat bizerte'] },
    { name: 'Béja', code: 'TN-31', region: 'Nord', color: '#6366F1', keywords: ['béja', 'medjez el-bab', 'tebourba', 'testour', 'goubellat', 'nefza', 'amdoun', 'gouvernorat béja'] },
    { name: 'Jendouba', code: 'TN-32', region: 'Nord', color: '#A855F7', keywords: ['jendouba', 'tabarka', 'ain drahem', 'fernana', 'ghardimaou', 'bou salem', 'oued mliz', 'gouvernorat jendouba'] },
    { name: 'Le Kef', code: 'TN-33', region: 'Nord', color: '#EAB308', keywords: ['le kef', 'el kef', 'sakiet sidi youssef', 'kalaat senan', 'tajerouine', 'dahmani', 'jerissa', 'gouvernorat le kef'] },
    { name: 'Siliana', code: 'TN-34', region: 'Nord', color: '#22C55E', keywords: ['siliana', 'makthar', 'rouhia', 'bou arada', 'gaafour', 'kesra', 'el aroussa', 'gouvernorat siliana'] },
    
    // CENTRE
    { name: 'Sousse', code: 'TN-51', region: 'Centre', color: '#06B6D4', keywords: ['sousse', 'sahloul', 'msaken', 'kalâa kebira', 'kalâa seghira', 'akouda', 'bouficha', 'hammam sousse', 'port el kantaoui', 'boujaafar', 'délégation sousse', 'gouvernorat sousse'] },
    { name: 'Monastir', code: 'TN-52', region: 'Centre', color: '#84CC16', keywords: ['monastir', 'moknine', 'jemmal', 'sahline', 'teboulba', 'bekalta', 'ksar helal', 'bembla', 'ouerdanine', 'délégation monastir', 'gouvernorat monastir'] },
    { name: 'Mahdia', code: 'TN-53', region: 'Centre', color: '#D946EF', keywords: ['mahdia', 'bou merdes', 'hbira', 'chellal', 'el jem', 'souassi', 'melloulech', 'délégation mahdia', 'gouvernorat mahdia'] },
    { name: 'Sfax', code: 'TN-61', region: 'Centre', color: '#EF4444', keywords: ['sfax', 'sakiet ezzit', 'sakiet eddaier', 'thyna', 'agra', 'bir ali ben khelifa', 'el hencha', 'mahrès', 'kerkenah', 'délégation sfax', 'gouvernorat sfax'] },
    { name: 'Kairouan', code: 'TN-41', region: 'Centre', color: '#F97316', keywords: ['kairouan', 'riadh', 'hajeb el ayoun', 'nasrallah', 'menzel mehiri', 'chebika', 'oueslatia', 'bou hajla', 'gouvernorat kairouan'] },
    { name: 'Kasserine', code: 'TN-42', region: 'Centre', color: '#FDBA74', keywords: ['kasserine', 'sbeitla', 'thala', 'fériana', 'foussana', 'jedelienne', 'hidra', 'magel bel abbes', 'gouvernorat kasserine'] },
    { name: 'Sidi Bouzid', code: 'TN-43', region: 'Centre', color: '#94A3B8', keywords: ['sidi bouzid', 'souk jedid', 'mezouna', 'jilma', 'bir el hfay', 'cebbala', 'menzel bouzaiane', 'gouvernorat sidi bouzid'] },
    
    // SUD
    { name: 'Gabès', code: 'TN-71', region: 'Sud', color: '#C084FC', keywords: ['gabès', 'chenini', 'matmata', 'mareth', 'ghannouch', 'metouia', 'ouedhref', 'teboulbou', 'gouvernorat gabès'] },
    { name: 'Médenine', code: 'TN-72', region: 'Sud', color: '#FB923C', keywords: ['médenine', 'jerba', 'houmt souk', 'midoun', 'ajim', 'zarzis', 'ben guerden', 'gouvernorat médenine'] },
    { name: 'Tataouine', code: 'TN-73', region: 'Sud', color: '#F87171', keywords: ['tataouine', 'ghomrassen', 'dehiba', 'remada', 'bir lahmar', 'gouvernorat tataouine'] },
    { name: 'Gafsa', code: 'TN-81', region: 'Sud', color: '#4ADE80', keywords: ['gafsa', 'metlaoui', 'moularès', 'redeyef', 'sened', 'el guettar', 'belkhir', 'gouvernorat gafsa'] },
    { name: 'Tozeur', code: 'TN-82', region: 'Sud', color: '#FBBF24', keywords: ['tozeur', 'nefta', 'tamerza', 'chebika', 'degache', 'hazoua', 'gouvernorat tozeur'] },
    { name: 'Kébili', code: 'TN-83', region: 'Sud', color: '#FF6B6B', keywords: ['kébili', 'douz', 'souk lahhad', 'faz', 'jelma', 'kebili', 'gouvernorat kébili'] },
  ];

  /**
   * Extrait le gouvernorat d'une adresse
   * Priorité: correspondance exacte > mot-clé spécifique > premier match
   */
  extractGovernorateFromAddress(address: string): string {
    if (!address || address === 'Adresse non renseignée') {
      return 'Non spécifié';
    }

    const addressLower = address.toLowerCase();
    const matches: { name: string; keyword: string }[] = [];
    
    // Collecter tous les matches possibles
    for (const gov of this.governorates) {
      // Vérifier le nom complet
      if (addressLower.includes(gov.name.toLowerCase())) {
        matches.push({ name: gov.name, keyword: gov.name.toLowerCase() });
      }
      
      // Vérifier les mots-clés
      for (const keyword of gov.keywords) {
        if (addressLower.includes(keyword.toLowerCase())) {
          matches.push({ name: gov.name, keyword: keyword.toLowerCase() });
        }
      }
    }
    
    if (matches.length === 0) {
      return 'Non spécifié';
    }
    
    // Priorité: longueur du mot-clé (le plus spécifique d'abord)
    matches.sort((a, b) => b.keyword.length - a.keyword.length);
    
    console.log(`   🔍 Matches trouvés: ${matches.map(m => `${m.name} (via "${m.keyword}")`).join(', ')}`);
    console.log(`   ✅ Sélectionné: ${matches[0].name}`);
    
    return matches[0].name;
  }

  getGovernorateColor(govName: string): string {
    const gov = this.governorates.find(g => g.name === govName);
    return gov?.color || '#9CA3AF';
  }

  getGovernorateByAddress(address: string): Governorate | null {
    const govName = this.extractGovernorateFromAddress(address);
    return this.governorates.find(g => g.name === govName) || null;
  }

  getGovernorateByName(name: string): Governorate | null {
    return this.governorates.find(g => g.name === name) || null;
  }

  getAllGovernorates(): Governorate[] {
    return this.governorates;
  }
}