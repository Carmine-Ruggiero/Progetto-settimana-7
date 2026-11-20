const API = 'https://www.thesportsdb.com/api/v1/json/123';

const form = document.querySelector('#searchForm');
const input = document.querySelector('#searchInput');
const favContainer = document.querySelector('#favoritesContainer');
const resultsContainer = document.querySelector('#searchResultsContainer');

const detailsContainer = document.createElement('div');
detailsContainer.className = 'mt-4';
resultsContainer.after(detailsContainer);

let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let foundTeams = [];
let selectedId = null;


function el(tag, className = '', text = '') {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (text) node.textContent = text;
	return node;
}

const message = (text) => el('p', 'text-body-secondary fst-italic', text);

const isFavorite = (id) => favorites.some((f) => f.idTeam === id);

form.addEventListener('submit', async (e) => {
	e.preventDefault();
	const team = input.value.trim();
	if (!team) return;

	resultsContainer.textContent = 'Ricerca in corso…';
	detailsContainer.replaceChildren();

	try {
		const response = await fetch(`${API}/searchteams.php?t=${encodeURIComponent(team)}`);
		const data = await response.json();

		if (!data.teams) {
			foundTeams = [];
			resultsContainer.textContent = `Nessuna squadra trovata per “${team}”.`;
			return;
		}

		foundTeams = data.teams;
		selectedId = foundTeams[0].idTeam;
		showFoundTeams();
		showFavorites();
		loadEvents(foundTeams[0].idTeam, foundTeams[0].strTeam, false);
	} catch (error) {
		console.error(error);
		resultsContainer.textContent = 'Errore nel caricamento dei dati. Riprova.';
	}
});


async function loadEvents(idTeam, name, scroll) {
	detailsContainer.textContent = 'Carico partite e risultati…';
	if (scroll) detailsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });

	try {
		const [nextRes, lastRes] = await Promise.all([
			fetch(`${API}/eventsnext.php?id=${idTeam}`),
			fetch(`${API}/eventslast.php?id=${idTeam}`),
		]);
		const next = await nextRes.json();
		const last = await lastRes.json();

		
		if (idTeam !== selectedId) return;

		detailsContainer.replaceChildren(buildDetails(name, next.events, last.results));
	} catch (error) {
		console.error(error);
		detailsContainer.textContent = 'Errore nel caricamento degli eventi.';
	}
}

function buildDetails(name, nextEvents, lastResults) {
	const card = el('div', 'card details-card');
	const body = el('div', 'card-body p-4');

	body.append(
		el('h3', 'h4 details-title', name),
		el('h4', 'section-title', 'Prossimi eventi'),
		eventList(nextEvents, false, 'Nessun evento in programma'),
		el('h4', 'section-title', 'Ultimi risultati'),
		eventList(lastResults, true, 'Nessun risultato disponibile'),
	);

	card.append(body);
	return card;
}

function eventList(events, withScore, emptyText) {
	if (!events) return message(emptyText);

	const ul = el('ul', 'event-list');

	events.forEach((ev) => {
		const [y, m, d] = ev.dateEvent.split('-');
		const li = el('li', 'event-item d-flex justify-content-between align-items-center');

		const info = el('div');
		info.append(
			el('div', 'event-date', `${d}/${m}/${y}`),
			el('div', 'fw-semibold', ev.strEvent),
		);
		li.append(info);

		if (withScore && ev.intHomeScore !== null) {
			li.append(el('span', 'badge score-badge', `${ev.intHomeScore} – ${ev.intAwayScore}`));
		}

		ul.append(li);
	});

	return ul;
}


function teamCard(team) {
	const fav = isFavorite(team.idTeam);

	const col = el('div', 'col');
	const card = el(
		'div',
		'card team-card h-100 text-center' + (team.idTeam === selectedId ? ' is-selected' : ''),
	);
	card.dataset.open = team.idTeam;
	card.dataset.name = team.strTeam;

	const body = el('div', 'card-body');

	let badge;
	if (team.strBadge) {
		badge = el('img', 'team-badge mx-auto mb-3');
		badge.src = `${team.strBadge}/small`;
		badge.alt = team.strTeam;
	} else {
		badge = el('div', 'team-badge team-badge--empty mx-auto mb-3', '⚽');
	}

	const button = el(
		'button',
		fav ? 'btn btn-sm btn-fav-remove w-100' : 'btn btn-sm btn-fav-add w-100',
		fav ? 'Rimuovi' : 'Aggiungi ai preferiti',
	);
	button.type = 'button';
	if (fav) button.dataset.remove = team.idTeam;
	else button.dataset.add = team.idTeam;

	body.append(
		badge,
		el('h3', 'h6 fw-bold mb-1', team.strTeam),
		el('p', 'team-meta mb-0', team.strLeague),
		el('p', 'team-meta mb-3', team.strCountry),
		button,
	);

	card.append(body);
	col.append(card);
	return col;
}

function grid(teams) {
	const row = el('div', 'row row-cols-1 row-cols-sm-2 row-cols-lg-3 row-cols-xl-4 g-3');
	row.append(...teams.map(teamCard));
	return row;
}

function showFoundTeams() {

	resultsContainer.replaceChildren(grid(foundTeams));
}

function showFavorites() {
	if (favorites.length === 0) {
		favContainer.replaceChildren(
			message('Non hai ancora salvato nessuna squadra. Cercane una qui sopra e aggiungila ai preferiti.'),
		);
		return;
	}
	favContainer.replaceChildren(grid(favorites));
}

function saveFavorites() {
	localStorage.setItem('favorites', JSON.stringify(favorites));
}


document.addEventListener('click', (e) => {
	const addBtn = e.target.closest('[data-add]');
	if (addBtn) {
		const team = foundTeams.find((t) => t.idTeam === addBtn.dataset.add);
		if (team && !isFavorite(team.idTeam)) {
			favorites.push({
				idTeam: team.idTeam,
				strTeam: team.strTeam,
				strBadge: team.strBadge,
				strLeague: team.strLeague,
				strCountry: team.strCountry,
			});
			saveFavorites();
		}
		showFavorites();
		showFoundTeams();
		return;
	}

	const removeBtn = e.target.closest('[data-remove]');
	if (removeBtn) {
		favorites = favorites.filter((f) => f.idTeam !== removeBtn.dataset.remove);
		saveFavorites();
		showFavorites();
		if (foundTeams.length) showFoundTeams();
		return;
	}

	const card = e.target.closest('[data-open]');
	if (card) {
		selectedId = card.dataset.open;
		showFavorites();
		if (foundTeams.length) showFoundTeams();
		loadEvents(selectedId, card.dataset.name, true);
	}
});


const themeToggle = document.querySelector('#themeToggle');
const themeIcon = document.querySelector('#themeIcon');

function applyTheme(theme) {
	document.documentElement.setAttribute('data-bs-theme', theme);
	themeIcon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
}

applyTheme(localStorage.getItem('theme') || 'light');

themeToggle.addEventListener('click', () => {
	const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
	applyTheme(next);
	localStorage.setItem('theme', next);
});


showFavorites();


loadFavoritesResults();