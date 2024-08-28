import sqlite3
import os
import json
import xml.etree.ElementTree as ET

# Define the database path and data directory
DB_PATH = 'arrazi.db'
DATA_DIR = 'data'
SURAH_MAP_PATH = os.path.join(DATA_DIR, 'surah_map.json')

# Create a connection to the database
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Function to drop all existing tables
def drop_tables():
    c.execute('DROP TABLE IF EXISTS surahs')
    c.execute('DROP TABLE IF EXISTS paragraphs')

# Create tables if they don't exist
def create_tables():
    c.execute('''
        CREATE TABLE IF NOT EXISTS surahs (
            id INTEGER PRIMARY KEY,
            name TEXT
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS paragraphs (
            id INTEGER PRIMARY KEY,
            surah_id INTEGER,
            content TEXT,
            FOREIGN KEY (surah_id) REFERENCES surahs (id)
        )
    ''')

# Function to extract all text content from an XML element
def extract_text(element):
    text = element.text.strip() if element.text else ''
    for child in element:
        text += extract_text(child)
    text += element.tail.strip() if element.tail else ''
    return text

# Function to parse XML and populate the database
def parse_and_populate():
    with open(SURAH_MAP_PATH, 'r', encoding='utf-8') as f:
        surah_map = json.load(f)

    for surah_number, parts in surah_map.items():
        surah_number = int(surah_number)
        for part in parts:
            file_path = os.path.join(DATA_DIR, part['file'])
            print(f"Processing file: {file_path}")  # Debugging statement
            try:
                tree = ET.parse(file_path)
                root = tree.getroot()

                # Register namespaces
                namespaces = {'ns': 'http://www.w3.org/1999/xhtml'}

                # Extract surah name
                h1_element = root.find('.//ns:h1', namespaces)
                if h1_element is not None:
                    surah_name = h1_element.text.strip()  # Strip whitespace
                else:
                    print(f"Warning: <h1> element not found in file: {file_path}")
                    continue  # Skip this file

                # Insert surah into the database if not already present
                c.execute('INSERT OR IGNORE INTO surahs (id, name) VALUES (?, ?)', (surah_number, surah_name))

                # Extract all text content from <span> or <p> elements
                span_elements = root.findall('.//ns:span', namespaces)
                p_elements = root.findall('.//ns:p', namespaces)
                all_elements = span_elements + p_elements

                for element in all_elements:
                    content = extract_text(element)
                    if content:
                        print(f"Inserting content: {content}")  # Debugging statement
                        c.execute('INSERT INTO paragraphs (surah_id, content) VALUES (?, ?)', (surah_number, content))

            except ET.ParseError as e:
                print(f"Error parsing file {file_path}: {e}")
            except Exception as e:
                print(f"Unexpected error processing file {file_path}: {e}")

    # Commit changes and close the connection
    conn.commit()
    conn.close()

if __name__ == '__main__':
    drop_tables()
    create_tables()
    parse_and_populate()