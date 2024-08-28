import sqlite3

# Define the database path
DB_PATH = 'arrazi.db'

# Function to search for a passage in the database
def search_passage(query):
    # Connect to the database
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Convert query to lowercase for case-insensitive search
    query = query.lower()

    # Query the database
    c.execute("""
        SELECT surahs.name, paragraphs.content 
        FROM paragraphs 
        JOIN surahs ON paragraphs.surah_id = surahs.id 
        WHERE paragraphs.content LIKE ?
    """, (f'%{query}%',))

    # Fetch all results
    results = c.fetchall()

    # Close the connection
    conn.close()

    return results

# Main function to run the search
def main():
    # Example search query
    search_query = 'كونها معربة:'
    # Perform the search
    results = search_passage(search_query)

    # Print the results
    if results:
        print(f"Found {len(results)} results for the query '{search_query}':")
        for result in results:
            surah_name, content = result
            print(f"Surah: {surah_name}")
            print(f"Content: {content}")
            print('-' * 80)
    else:
        print(f"No results found for the query '{search_query}'")

if __name__ == '__main__':
    main()