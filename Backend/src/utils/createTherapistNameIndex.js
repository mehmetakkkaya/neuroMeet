const { client } = require('../config/elasticsearch');
const INDEX_NAME = 'therapist_names';

async function createIndex() {
  try {
    const exists = await client.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      console.log(`Index oluşturuluyor: ${INDEX_NAME}`);
      await client.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              mysqlId: { type: 'integer' }, 
              name: { 
                type: 'text', 
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword', ignore_above: 256 },
                  edge_ngram_completion: { 
                     type: "text",
                     analyzer: "edge_ngram_analyzer"
                  }
                }
              },
              status: { type: 'keyword' } 
            }
          },
          settings: {
            analysis: {
               analyzer: {
                  edge_ngram_analyzer: {
                     tokenizer: "edge_ngram_tokenizer",
                     filter: ["lowercase"]
                  }
               },
               tokenizer: {
                  edge_ngram_tokenizer: {
                     type: "edge_ngram",
                     min_gram: 2,
                     max_gram: 15,
                     token_chars: ["letter", "digit"]
                  }
               }
            }
          }
        }
      });
      console.log(`Index başarıyla oluşturuldu: ${INDEX_NAME}`);
    } else {
      console.log(`Index zaten mevcut: ${INDEX_NAME}`);
    }
  } catch (error) {
    console.error(`Index oluşturulurken hata (${INDEX_NAME}):`, error.meta ? error.meta.body : error);
    // Hata durumunda uygulamayı durdurmak yerine sadece loglamak daha iyi olabilir
  }
}

module.exports = { createIndex, INDEX_NAME }; 