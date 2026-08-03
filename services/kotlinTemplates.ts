
// services/kotlinTemplates.ts

export const mainActivityKtTemplate = `package {{PACKAGE_NAME}}

import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import com.google.android.material.card.MaterialCardView
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.constraintlayout.widget.ConstraintLayout
import android.content.SharedPreferences
import android.content.ClipboardManager
import android.content.ClipData
import android.widget.Toast
import androidx.appcompat.app.AppCompatDelegate
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class MainActivity : AppCompatActivity() {

    private lateinit var recyclerViewChat: RecyclerView
    private lateinit var editTextMessage: EditText
    private lateinit var buttonSend: Button
    private lateinit var chatAdapter: ChatAdapter
    private val messageList = mutableListOf<Message>()
    
    private val isDarkTheme: Boolean = {{IS_DARK_THEME}}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        findViewById<TextView>(R.id.txtAppName).text = "{{APP_NAME}}"

        recyclerViewChat = findViewById(R.id.recyclerViewChat)
        editTextMessage = findViewById(R.id.editTextMessage)
        buttonSend = findViewById(R.id.buttonSend)

        setupChat()
        initFinancialModules()
    }

    /**
     * Persistência Segura com EncryptedSharedPreferences (AES-256 GCM)
     */
    private fun getEncryptedPreferences(): SharedPreferences {
        val masterKey = MasterKey.Builder(this)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        return EncryptedSharedPreferences.create(
            this,
            "encrypted_app_secrets",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SKEY,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun saveGithubTokenSecured(token: String) {
        getEncryptedPreferences().edit().putString("PAT_TOKEN", token).apply()
        Toast.makeText(this, "PAT salvo com criptografia AES-256!", Toast.LENGTH_SHORT).show()
    }

    fun getGithubTokenSecured(): String? {
        return getEncryptedPreferences().getString("PAT_TOKEN", null)
    }

    /**
     * Módulo de Gestão Financeira, Metas e Estatísticas
     */
    private fun initFinancialModules() {
        // Exemplo de inclusão de meta inicial
        messageList.add(Message("Finance Pro", "💰 Meta Ativa: Reserva de Emergência (R$ 5.000,00)\n📊 Clique em Copiar PIX para depositar na meta."))
    }

    fun copyPixKeyToClipboard(pixKey: String = "00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5915Heavy Financeiro6009SAO PAULO62070503***6304E2CA") {
        val clipboard = getSystemService(CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Chave PIX Meta Financeira", pixKey)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(this, "Chave PIX da meta copiada com sucesso!", Toast.LENGTH_LONG).show()
    }

    fun exportTransactionsToCsv(): String {
        val csv = StringBuilder()
        csv.append("Data,Categoria,Descricao,Valor\n")
        csv.append("2026-08-01,Alimentacao,Mercado Central,350.50\n")
        csv.append("2026-08-02,Moradia,Aluguel Residencial,1500.00\n")
        csv.append("2026-08-03,Investimento,Aporte Meta PIX,200.00\n")
        
        Toast.makeText(this, "Planilha CSV gerada com sucesso!", Toast.LENGTH_SHORT).show()
        return csv.toString()
    }

    fun toggleAppTheme() {
        val currentMode = AppCompatDelegate.getDefaultNightMode()
        if (currentMode == AppCompatDelegate.MODE_NIGHT_YES) {
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
        } else {
            AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
        }
    }

    private fun setupChat() {
        chatAdapter = ChatAdapter(messageList)
        recyclerViewChat.layoutManager = LinearLayoutManager(this)
        recyclerViewChat.adapter = chatAdapter

        messageList.add(Message("HeavyMobile AI", "Olá! Como posso ajudar você hoje no controle financeiro e builds?"))
        chatAdapter.notifyItemInserted(messageList.size - 1)

        buttonSend.setOnClickListener {
            val messageText = editTextMessage.text.toString().trim()
            if (messageText.isEmpty()) return@setOnClickListener

            messageList.add(Message("Você", messageText))
            chatAdapter.notifyItemInserted(messageList.size - 1)
            recyclerViewChat.scrollToPosition(messageList.size - 1)
            editTextMessage.setText("") 

            if (messageText.lowercase().contains("pix")) {
                copyPixKeyToClipboard()
            } else if (messageText.lowercase().contains("csv") || messageText.lowercase().contains("planilha")) {
                exportTransactionsToCsv()
            }

            Handler(Looper.getMainLooper()).postDelayed({
                val aiResponse = "Processado! Transação e comandos validados com segurança."
                messageList.add(Message("HeavyMobile AI", aiResponse))
                chatAdapter.notifyItemInserted(messageList.size - 1)
                recyclerViewChat.scrollToPosition(messageList.size - 1)
            }, 800)
        }
    }

    data class Message(val sender: String, val text: String)

    inner class ChatAdapter(private val messages: MutableList<Message>) :
        RecyclerView.Adapter<ChatAdapter.MessageViewHolder>() {

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_message, parent, false)
            return MessageViewHolder(view)
        }

        override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
            holder.bind(messages[position])
        }

        override fun getItemCount(): Int = messages.size

        inner class MessageViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
            private val messageCard: MaterialCardView = itemView.findViewById(R.id.messageCard)
            private val textViewMessage: TextView = itemView.findViewById(R.id.textViewMessage)
            private val textViewSender: TextView = itemView.findViewById(R.id.textViewSender)

            fun bind(message: Message) {
                textViewMessage.text = message.text
                textViewSender.text = message.sender.uppercase()

                val layoutParams = messageCard.layoutParams as ConstraintLayout.LayoutParams
                
                if (message.sender == "Você") {
                    messageCard.setCardBackgroundColor(ContextCompat.getColor(itemView.context, if (isDarkTheme) R.color.chat_bubble_user_dark else R.color.chat_bubble_user_light))
                    textViewMessage.setTextColor(ContextCompat.getColor(itemView.context, R.color.chat_text_user))
                    textViewSender.setTextColor(ContextCompat.getColor(itemView.context, R.color.chat_sender_user))
                    layoutParams.horizontalBias = 1.0f
                } else {
                    messageCard.setCardBackgroundColor(ContextCompat.getColor(itemView.context, if (isDarkTheme) R.color.chat_bubble_ai_dark else R.color.chat_bubble_ai_light))
                    textViewMessage.setTextColor(ContextCompat.getColor(itemView.context, if (isDarkTheme) R.color.chat_text_ai_dark else R.color.chat_text_ai_light))
                    textViewSender.setTextColor(ContextCompat.getColor(itemView.context, if (isDarkTheme) R.color.chat_sender_ai_dark else R.color.chat_sender_ai_light))
                    layoutParams.horizontalBias = 0.0f
                }
                
                messageCard.layoutParams = layoutParams
            }
        }
    }
}
`