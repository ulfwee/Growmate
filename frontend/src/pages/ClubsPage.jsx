import '../css/ClubsPage.css';
import React, { useEffect, useMemo, useState, } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faPlus, faArrowRight, faStar, faCompass, faXmark, } from '@fortawesome/free-solid-svg-icons';
import SimpleClubCard from '../components/clubs/SimpleClubCard';
import CreateClubModal from '../components/clubs/CreateClubModal';
import { getClubs, getRecommendedClubs, getClubCategories, createClub, } from '../services/clubsService';
const RECOMMENDATIONS_LIMIT = 6;
export default function ClubsPage() {
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendationError, setRecommendationError] = useState(false);
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      setError('');
      const [clubsResult, recommendedResult, categoriesResult] = await Promise.allSettled([
        getClubs(),
        getRecommendedClubs(),
        getClubCategories(),
      ]);
      if (!active)
        return;
      if (clubsResult.status === 'fulfilled') {
        setClubs(Array.isArray(clubsResult.value)
          ? clubsResult.value
          : []);
      }
      else {
        setError(clubsResult.reason?.message ||
          'Не вдалося завантажити клуби.');
      }
      if (recommendedResult.status === 'fulfilled') {
        setRecommended(Array.isArray(recommendedResult.value)
          ? recommendedResult.value
          : []);
      }
      else {
        setRecommendationError(true);
      }
      if (categoriesResult.status === 'fulfilled') {
        setCategories(Array.isArray(categoriesResult.value)
          ? categoriesResult.value
          : []);
      }
      setLoading(false);
    };
    loadData();
    return () => {
      active = false;
    };
  }, []);
  const recommendedMap = useMemo(() => {
    return new Map(recommended.map((club) => [
      String(club.id),
      club,
    ]));
  }, [recommended]);
  const allClubs = useMemo(() => {
    const clubsById = new Map();
    clubs.forEach((club) => {
      clubsById.set(String(club.id), club);
    });
    recommended.forEach((recommendation) => {
      const id = String(recommendation.id);
      const existing = clubsById.get(id);
      if (existing) {
        clubsById.set(id, {
          ...existing,
          ...recommendation,
          isMember: existing.isMember,
          isOwner: existing.isOwner,
          membersCount: existing.membersCount,
        });
      }
    });
    return Array.from(clubsById.values());
  }, [clubs, recommended]);
  const isSearching = search.trim().length > 0 || category !== '';
  const recommendedClubs = useMemo(() => {
    return allClubs
      .filter((club) => recommendedMap.has(String(club.id)))
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      .slice(0, RECOMMENDATIONS_LIMIT);
  }, [allClubs, recommendedMap]);
  const otherClubs = useMemo(() => {
    const recommendedIds = new Set(recommendedClubs.map((club) => String(club.id)));
    return allClubs.filter((club) => !recommendedIds.has(String(club.id)));
  }, [allClubs, recommendedClubs]);
  const searchResults = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('uk');
    return allClubs.filter((club) => {
      const clubCategoryId = club.categoryId ??
        categories.find((item) => item.name === club.categoryName)?.id;
      const matchesCategory = !category ||
        String(clubCategoryId) === category;
      const searchableText = [
        club.name,
        club.description,
        club.categoryName,
        ...(club.matchingInterests || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('uk');
      const matchesSearch = !query || searchableText.includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [allClubs, search, category, categories]);
  const clearFilters = () => {
    setSearch('');
    setCategory('');
  };
  const save = async (payload) => {
    setCreating(true);
    setCreateError('');
    try {
      const result = await createClub(payload);
      if (!result?.clubId) {
        throw new Error('Сервер не повернув ID клубу.');
      }
      navigate(`/clubs/${result.clubId}`);
    }
    catch (err) {
      setCreateError(err.message);
    }
    finally {
      setCreating(false);
    }
  };
  return (<main className="clubs-page gm-clubs-page">
    <div className="gm-eyebrow">
      СПІЛЬНОТИ GROWMATE
    </div>

    <div className="gm-page-heading">
      <div>
        <h1>Знайдіть свою спільноту</h1>

        <p>
          Знаходьте людей зі схожими інтересами,
          навчайтеся та досягайте цілей разом.
        </p>
      </div>

      <button type="button" className="clubs-button-primary" onClick={() => setShowCreate(true)}>
        <FontAwesomeIcon icon={faPlus} />
        Створити клуб
      </button>
    </div>

    <form className="gm-searchbar" onSubmit={(event) => event.preventDefault()}>
      <FontAwesomeIcon icon={faMagnifyingGlass} />

      <input aria-label="Пошук клубів" placeholder="Пошук за назвою, темою чи ключовим словом" value={search} onChange={(event) => setSearch(event.target.value)} />

      {search && (<button type="button" className="gm-search-clear" onClick={() => setSearch('')} aria-label="Очистити пошук">
        <FontAwesomeIcon icon={faXmark} />
      </button>)}
    </form>

    <div className="gm-categories">
      <button type="button" className={!category ? 'selected' : ''} onClick={() => setCategory('')}>
        Усі
      </button>

      {categories.map((item) => (<button key={item.id} type="button" className={category === String(item.id)
        ? 'selected'
        : ''} onClick={() => setCategory(category === String(item.id)
          ? ''
          : String(item.id))}>
        {item.name}
      </button>))}
    </div>

    {error && (<p className="gm-error" role="alert">
      {error}
    </p>)}

    {loading ? (<div className="gm-empty">
      Завантаження клубів...
    </div>) : isSearching ? (<section className="gm-clubs-section">
      <div className="gm-section-heading">
        <div>
          <h2>Результати пошуку</h2>
          <p>
            Знайдено клубів: {searchResults.length}
          </p>
        </div>

        <button type="button" className="gm-clear-filters" onClick={clearFilters}>
          <FontAwesomeIcon icon={faXmark} />
          Скинути фільтри
        </button>
      </div>

      {searchResults.length > 0 ? (<div className="gm-club-grid">
        {searchResults.map((club) => (<SimpleClubCard key={club.id} club={club} recommended={recommendedMap.has(String(club.id))} />))}
      </div>) : (<div className="gm-empty">
        За вашим запитом клубів не знайдено.
        Спробуйте змінити пошук або категорію.
      </div>)}
    </section>) : (<>

      <section className="gm-clubs-section">
        <div className="gm-section-heading gm-recommended-heading">
          <div>
            <div className="gm-section-kicker">
              <FontAwesomeIcon icon={faStar} />
              ПЕРСОНАЛЬНИЙ ПІДБІР
            </div>

            <h2>
              Клуби, які можуть вам сподобатися
            </h2>

            <p>
              Ми підібрали їх на основі ваших інтересів.
            </p>
          </div>

          <Link to="/my-clubs">
            Мої клуби
            <FontAwesomeIcon icon={faArrowRight} />
          </Link>
        </div>

        {recommendationError ? (<div className="gm-recommend-empty">
          Не вдалося завантажити рекомендації.
          Інші клуби доступні нижче.
        </div>) : recommendedClubs.length > 0 ? (<div className="gm-club-grid">
          {recommendedClubs.map((club) => (<SimpleClubCard key={club.id} club={club} recommended />))}
        </div>) : (<div className="gm-recommend-empty">
          <div className="gm-recommend-empty-icon">
            <FontAwesomeIcon icon={faStar} />
          </div>

          <div>
            <h3>
              Поки немає персональних рекомендацій
            </h3>

            <p>
              Оберіть інтереси у своєму профілі,
              щоб ми могли підібрати клуби для вас.
              А поки перегляньте інші спільноти нижче.
            </p>
          </div>
        </div>)}
      </section>


      {otherClubs.length > 0 && (<section className="gm-clubs-section gm-other-section">
        <div className="gm-section-heading">
          <div>
            <div className="gm-section-kicker gm-section-kicker-muted">
              <FontAwesomeIcon icon={faCompass} />
              ДОСЛІДЖУЙТЕ СПІЛЬНОТИ
            </div>

            <h2>Відкрийте більше спільнот</h2>

            <p>
              Знайомтеся з іншими клубами та
              відкривайте нові захоплення.
            </p>
          </div>

          <span className="gm-clubs-count">
            {otherClubs.length} клубів
          </span>
        </div>

        <div className="gm-club-grid">
          {otherClubs.map((club) => (<SimpleClubCard key={club.id} club={club} recommended={false} />))}
        </div>
      </section>)}

      {allClubs.length === 0 && !error && (<div className="gm-empty">
        Поки немає доступних клубів.
        Створіть першу спільноту!
      </div>)}
    </>)}

    {showCreate && (<CreateClubModal categories={categories} onClose={() => setShowCreate(false)} onCreate={save} saving={creating} error={createError} />)}
  </main>);
}