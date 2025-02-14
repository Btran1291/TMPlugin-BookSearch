async function search_books(params, userSettings) {
  const { q, title, author, subject, place, person, language, offset = 0 } = params;
  const sort = userSettings.sort;
  const publishYearFrom = userSettings.publish_year_from.trim();
  const publishYearTo = userSettings.publish_year_to.trim();
  const limit = userSettings.limit;
  if (limit && (isNaN(limit) || limit <= 0)) { return { error: "Invalid limit value. It must be a positive number." }; }
  if (publishYearFrom && isNaN(publishYearFrom)) { return { error: "Invalid publish year from value. It must be a number." }; }
  if (publishYearTo && isNaN(publishYearTo)) { return { error: "Invalid publish year to value. It must be a number." }; }
  let apiUrl = 'https://openlibrary.org/search.json?';
  let queryParts = [];
  if (q) { queryParts.push(encodeURIComponent(q)); }
  const publishYearFilter = buildPublishYearFilter(publishYearFrom, publishYearTo);
  if (publishYearFilter) { queryParts.push(encodeURIComponent(publishYearFilter)); }
  if (queryParts.length > 0) { apiUrl += `q=${queryParts.join('+')}`; }
  const additionalParams = { title, author, subject, place, person, language };
  for (const [key, value] of Object.entries(additionalParams)) { if (value) { apiUrl += `&${key}=${encodeURIComponent(value)}`; } }
  if (sort) { apiUrl += `&sort=${encodeURIComponent(sort)}`; }
  if (limit) { apiUrl += `&limit=${encodeURIComponent(limit)}`; }
  if (offset > 0) { apiUrl += `&offset=${encodeURIComponent(offset)}`; }
  const fields = "key,title,author_name,first_publish_year,publish_date,publisher,subject,person,place,time,language,ebook_access,cover_i";
  apiUrl += `&fields=${encodeURIComponent(fields)}`;
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = errorData.error || response.statusText;
      return { error: `Open Library API request failed: ${errorMessage} (${response.status})` };
    }
    const data = await response.json();
    if (data.docs.length > 0) {
      return {
        total: data.numFound,
        offset: offset,
        limit: limit,
        books: data.docs.map(book => ({
          key: book.key,
          title: book.title,
          author_name: book.author_name ? book.author_name.join(", ") : "Unknown",
          first_publish_year: book.first_publish_year || "N/A",
          ebook_access: book.ebook_access || "N/A",
          cover_image: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null,
          book_url: `https://openlibrary.org/${book.key}`,
          subject: book.subject ? book.subject.join(", ") : "N/A",
          publisher: book.publisher ? book.publisher.join(", ") : "Unknown"
        }))
      };
    } else { return { message: "No books found." }; }
  } catch (error) { return { error: `An unexpected error occurred: ${error.message}` }; }
}

function buildPublishYearFilter(publishYearFrom, publishYearTo) {
  let publishYearFilter = "first_publish_year:";
  if (publishYearFrom && publishYearTo) { publishYearFilter += `[${publishYearFrom} TO ${publishYearTo}]`; } else if (publishYearFrom) { publishYearFilter += `[${publishYearFrom} TO *]`; } else if (publishYearTo) { publishYearFilter += `[* TO ${publishYearTo}]`; } else { return null; }
  return publishYearFilter;
}
