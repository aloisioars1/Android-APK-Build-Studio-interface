// services/androidComponentLibrary.ts
import { AppConfig, GeneratedCode, UIComponent } from '../types';

export interface PrefabComponent {
  id: string;
  name: string;
  category: 'Autenticação' | 'Mídia Social' | 'Sistema & Configs' | 'E-Commerce' | 'Comunicação' | 'Painéis & Dashboards';
  description: string;
  icon: string;
  previewTags: string[];
  xmlLayout: string;
  kotlinLogic: string;
  uiComponents: UIComponent[];
}

export const PREFAB_COMPONENTS: PrefabComponent[] = [
  {
    id: 'login_screen',
    name: 'Tela de Login & Autenticação',
    category: 'Autenticação',
    description: 'Formulário completo com e-mail, senha com TextInputLayout, botão de login Material3, link de recuperação e validação em Kotlin.',
    icon: '🔐',
    previewTags: ['MaterialButton', 'TextInputLayout', 'EditText', 'Validação Kotlin'],
    xmlLayout: `<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/loginContainer"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:padding="24dp"
    android:background="@color/dark_bg">

    <ImageView
        android:id="@+id/imgLogo"
        android:layout_width="80dp"
        android:layout_height="80dp"
        android:src="@drawable/ic_send"
        app:tint="@color/send_button_tint"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        android:layout_marginTop="48dp" />

    <TextView
        android:id="@+id/txtWelcomeTitle"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Bem-vindo de volta"
        android:textSize="24sp"
        android:textStyle="bold"
        android:textColor="@android:color/white"
        app:layout_constraintTop_toBottomOf="@id/imgLogo"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        android:layout_marginTop="16dp" />

    <com.google.android.material.textfield.TextInputLayout
        android:id="@+id/inputLayoutEmail"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Endereço de E-mail"
        app:layout_constraintTop_toBottomOf="@id/txtWelcomeTitle"
        android:layout_marginTop="32dp">

        <com.google.android.material.textfield.TextInputEditText
            android:id="@+id/editEmail"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:inputType="textEmailAddress" />
    </com.google.android.material.textfield.TextInputLayout>

    <com.google.android.material.textfield.TextInputLayout
        android:id="@+id/inputLayoutPassword"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Senha de Acesso"
        app:passwordToggleEnabled="true"
        app:layout_constraintTop_toBottomOf="@id/inputLayoutEmail"
        android:layout_marginTop="16dp">

        <com.google.android.material.textfield.TextInputEditText
            android:id="@+id/editPassword"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:inputType="textPassword" />
    </com.google.android.material.textfield.TextInputLayout>

    <com.google.android.material.button.MaterialButton
        android:id="@+id/btnLoginSubmit"
        android:layout_width="match_parent"
        android:layout_height="56dp"
        android:text="ENTRAR NA CONTA"
        android:textStyle="bold"
        app:cornerRadius="16dp"
        app:layout_constraintTop_toBottomOf="@id/inputLayoutPassword"
        android:layout_marginTop="24dp" />

    <TextView
        android:id="@+id/txtForgotPassword"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Esqueceu a senha? Clique aqui"
        android:textColor="@color/send_button_tint"
        android:textSize="12sp"
        app:layout_constraintTop_toBottomOf="@id/btnLoginSubmit"
        app:layout_constraintStart_toStartOf="parent"
        app:layout_constraintEnd_toEndOf="parent"
        android:layout_marginTop="16dp" />

</androidx.constraintlayout.widget.ConstraintLayout>`,
    kotlinLogic: `// Lógica Kotlin da Tela de Login
fun setupLoginComponent() {
    val editEmail = findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.editEmail)
    val editPassword = findViewById<com.google.android.material.textfield.TextInputEditText>(R.id.editPassword)
    val btnLogin = findViewById<com.google.android.material.button.MaterialButton>(R.id.btnLoginSubmit)
    val txtForgot = findViewById<android.widget.TextView>(R.id.txtForgotPassword)

    btnLogin?.setOnClickListener {
        val email = editEmail?.text.toString().trim()
        val password = editPassword?.text.toString().trim()

        if (email.isEmpty()) {
            editEmail?.error = "Informe seu e-mail"
            return@setOnClickListener
        }
        if (password.length < 6) {
            editPassword?.error = "A senha deve conter no mínimo 6 caracteres"
            return@setOnClickListener
        }

        android.widget.Toast.makeText(this, "Login efetuado com sucesso para: $email", android.widget.Toast.LENGTH_LONG).show()
    }

    txtForgot?.setOnClickListener {
        android.widget.Toast.makeText(this, "Link de redefinição enviado para seu e-mail.", android.widget.Toast.LENGTH_SHORT).show()
    }
}`,
    uiComponents: [
      { type: 'input', label: 'E-mail de Acesso' },
      { type: 'input', label: 'Senha' },
      { type: 'button', label: 'ENTRAR NA CONTA', action: 'LOGIN' }
    ]
  },
  {
    id: 'feed_screen',
    name: 'Feed Social com Curtidas & Comentários',
    category: 'Mídia Social',
    description: 'Card social expansível com avatar do usuário, imagem de capa, botões interativos de curtir com contador em Kotlin e campo de comentário.',
    icon: '📲',
    previewTags: ['MaterialCardView', 'RecyclerView', 'Counter Kotlin', 'Interactive Buttons'],
    xmlLayout: `<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/feedContainer"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:padding="16dp">

    <com.google.android.material.card.MaterialCardView
        android:id="@+id/postCard"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        app:cardCornerRadius="20dp"
        app:cardElevation="6dp"
        app:strokeWidth="1dp"
        app:strokeColor="#33ffffff"
        app:layout_constraintTop_toTopOf="parent">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="vertical"
            android:padding="16dp">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="horizontal"
                android:gravity="center_vertical">

                <View
                    android:layout_width="40dp"
                    android:layout_height="40dp"
                    android:background="@drawable/ic_send"
                    android:backgroundTint="@color/send_button_tint" />

                <LinearLayout
                    android:layout_width="0dp"
                    android:layout_height="wrap_content"
                    android:layout_weight="1"
                    android:orientation="vertical"
                    android:layout_marginStart="12dp">

                    <TextView
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="Arquiteta Mobile Pro"
                        android:textStyle="bold"
                        android:textColor="@android:color/white"
                        android:textSize="14sp" />

                    <TextView
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:text="Há 5 minutos • Android Native"
                        android:textColor="#94a3b8"
                        android:textSize="10sp" />
                </LinearLayout>
            </LinearLayout>

            <TextView
                android:id="@+id/txtPostContent"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:text="Nova versão compilada com arquitetura Kotlin limpa e suporte a injeção dinâmica de componentes!"
                android:textColor="#e2e8f0"
                android:textSize="13sp"
                android:layout_marginTop="12dp" />

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="horizontal"
                android:layout_marginTop="16dp">

                <com.google.android.material.button.MaterialButton
                    android:id="@+id/btnLikePost"
                    style="@style/Widget.MaterialComponents.Button.OutlinedButton"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="❤️ Curtir (12)"
                    android:textSize="11sp" />

                <com.google.android.material.button.MaterialButton
                    android:id="@+id/btnCommentPost"
                    style="@style/Widget.MaterialComponents.Button.TextButton"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="💬 Comentar"
                    android:textSize="11sp"
                    android:layout_marginStart="8dp" />
            </LinearLayout>

        </LinearLayout>
    </com.google.android.material.card.MaterialCardView>

</androidx.constraintlayout.widget.ConstraintLayout>`,
    kotlinLogic: `// Lógica Kotlin para interatividade do Feed
private var likeCount = 12
private var isLiked = false

fun setupFeedComponent() {
    val btnLike = findViewById<com.google.android.material.button.MaterialButton>(R.id.btnLikePost)
    val btnComment = findViewById<com.google.android.material.button.MaterialButton>(R.id.btnCommentPost)

    btnLike?.setOnClickListener {
        isLiked = !isLiked
        if (isLiked) {
            likeCount++
            btnLike.text = "❤️ Curtido ($likeCount)"
            btnLike.setStrokeColorResource(android.R.color.holo_red_light)
        } else {
            likeCount--
            btnLike.text = "❤️ Curtir ($likeCount)"
            btnLike.setStrokeColorResource(android.R.color.white)
        }
    }

    btnComment?.setOnClickListener {
        android.widget.Toast.makeText(this, "Abre caixa de diálogo para novos comentários", android.widget.Toast.LENGTH_SHORT).show()
    }
}`,
    uiComponents: [
      { type: 'text', label: 'Postagem Social' },
      { type: 'button', label: '❤️ Curtir', action: 'LIKE' },
      { type: 'button', label: '💬 Comentar', action: 'COMMENT' }
    ]
  },
  {
    id: 'settings_screen',
    name: 'Painel de Configurações & Modo Escuro',
    category: 'Sistema & Configs',
    description: 'Menu de preferências com SwitchMaterial para alternar tema escuro/claro, notificações push e botão de logout seguro.',
    icon: '⚙️',
    previewTags: ['SwitchMaterial', 'SharedPreferences', 'Modo Escuro', 'Preferências'],
    xmlLayout: `<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/settingsContainer"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:padding="20dp">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="CONFIGURAÇÕES DO APP"
        android:textSize="12sp"
        android:textStyle="bold"
        android:textColor="@color/send_button_tint"
        android:letterSpacing="0.1" />

    <com.google.android.material.switchmaterial.SwitchMaterial
        android:id="@+id/switchDarkMode"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Modo Escuro (Dark Theme)"
        android:textSize="14sp"
        android:textColor="@android:color/white"
        android:paddingVertical="12dp"
        android:checked="true" />

    <com.google.android.material.switchmaterial.SwitchMaterial
        android:id="@+id/switchNotifications"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Notificações Push em Tempo Real"
        android:textSize="14sp"
        android:textColor="@android:color/white"
        android:paddingVertical="12dp"
        android:checked="true" />

    <com.google.android.material.button.MaterialButton
        android:id="@+id/btnLogout"
        style="@style/Widget.MaterialComponents.Button.OutlinedButton"
        android:layout_width="match_parent"
        android:layout_height="52dp"
        android:text="Sair da Conta (Logout)"
        android:textColor="#ef4444"
        app:strokeColor="#ef4444"
        android:layout_marginTop="24dp" />

</LinearLayout>`,
    kotlinLogic: `// Lógica Kotlin de Configurações
fun setupSettingsComponent() {
    val switchDark = findViewById<com.google.android.material.switchmaterial.SwitchMaterial>(R.id.switchDarkMode)
    val switchNotif = findViewById<com.google.android.material.switchmaterial.SwitchMaterial>(R.id.switchNotifications)
    val btnLogout = findViewById<com.google.android.material.button.MaterialButton>(R.id.btnLogout)

    switchDark?.setOnCheckedChangeListener { _, isChecked ->
        val mode = if (isChecked) androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES else androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_NO
        androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(mode)
        android.widget.Toast.makeText(this, "Tema alterado com sucesso!", android.widget.Toast.LENGTH_SHORT).show()
    }

    switchNotif?.setOnCheckedChangeListener { _, isChecked ->
        val msg = if (isChecked) "Notificações ativadas" else "Notificações silenciadas"
        android.widget.Toast.makeText(this, msg, android.widget.Toast.LENGTH_SHORT).show()
    }

    btnLogout?.setOnClickListener {
        android.widget.Toast.makeText(this, "Sessão encerrada com segurança.", android.widget.Toast.LENGTH_LONG).show()
    }
}`,
    uiComponents: [
      { type: 'switch', label: 'Modo Escuro', value: true },
      { type: 'switch', label: 'Notificações Push', value: true },
      { type: 'button', label: 'Sair da Conta', action: 'LOGOUT' }
    ]
  },
  {
    id: 'profile_screen',
    name: 'Perfil do Usuário com Estatísticas',
    category: 'Mídia Social',
    description: 'Header de perfil completo com contadores numéricos (Publicações, Seguidores, Seguindo), biografia e botão de ação para editar perfil.',
    icon: '👤',
    previewTags: ['Profile Card', 'Estatísticas', 'MaterialButton', 'Badge'],
    xmlLayout: `<androidx.constraintlayout.widget.ConstraintLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/profileContainer"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:padding="20dp"
    android:background="@color/dark_bg">

    <View
        android:id="@+id/avatarCircle"
        android:layout_width="72dp"
        android:layout_height="72dp"
        android:background="@drawable/ic_send"
        android:backgroundTint="@color/send_button_tint"
        app:layout_constraintTop_toTopOf="parent"
        app:layout_constraintStart_toStartOf="parent" />

    <LinearLayout
        android:id="@+id/statsBar"
        android:layout_width="0dp"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center"
        app:layout_constraintStart_toEndOf="@id/avatarCircle"
        app:layout_constraintEnd_toEndOf="parent"
        app:layout_constraintTop_toTopOf="@id/avatarCircle"
        app:layout_constraintBottom_toBottomOf="@id/avatarCircle"
        android:layout_marginStart="16dp">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="142"
                android:textStyle="bold"
                android:textColor="@android:color/white"
                android:textSize="16sp" />

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Posts"
                android:textColor="#94a3b8"
                android:textSize="10sp" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical"
            android:gravity="center">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="4.8k"
                android:textStyle="bold"
                android:textColor="@android:color/white"
                android:textSize="16sp" />

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="Seguidores"
                android:textColor="#94a3b8"
                android:textSize="10sp" />
        </LinearLayout>
    </LinearLayout>

    <TextView
        android:id="@+id/txtUserName"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Desenvolvedor Android Pro"
        android:textStyle="bold"
        android:textColor="@android:color/white"
        android:textSize="16sp"
        app:layout_constraintTop_toBottomOf="@id/avatarCircle"
        app:layout_constraintStart_toStartOf="parent"
        android:layout_marginTop="16dp" />

    <TextView
        android:id="@+id/txtUserBio"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Especialista em Kotlin, Jetpack Compose e UI Nativa. Criando experiências móveis incríveis."
        android:textColor="#cbd5e1"
        android:textSize="12sp"
        app:layout_constraintTop_toBottomOf="@id/txtUserName"
        android:layout_marginTop="6dp" />

    <com.google.android.material.button.MaterialButton
        android:id="@+id/btnEditProfile"
        style="@style/Widget.MaterialComponents.Button.OutlinedButton"
        android:layout_width="match_parent"
        android:layout_height="48dp"
        android:text="EDITAR PERFIL"
        android:textStyle="bold"
        app:layout_constraintTop_toBottomOf="@id/txtUserBio"
        android:layout_marginTop="16dp" />

</androidx.constraintlayout.widget.ConstraintLayout>`,
    kotlinLogic: `// Lógica Kotlin do Perfil do Usuário
fun setupProfileComponent() {
    val btnEdit = findViewById<com.google.android.material.button.MaterialButton>(R.id.btnEditProfile)
    btnEdit?.setOnClickListener {
        android.widget.Toast.makeText(this, "Abre tela de edição do perfil", android.widget.Toast.LENGTH_SHORT).show()
    }
}`,
    uiComponents: [
      { type: 'text', label: 'Estatísticas do Perfil' },
      { type: 'button', label: 'EDITAR PERFIL', action: 'EDIT_PROFILE' }
    ]
  },
  {
    id: 'ecommerce_screen',
    name: 'Card de Produto & Carrinho de Compras',
    category: 'E-Commerce',
    description: 'Visualizador de produto com preço formatado, seletor de quantidade [ - / + ] e cálculo dinâmico do total do pedido em tempo real em Kotlin.',
    icon: '🛍️',
    previewTags: ['E-Commerce', 'Carrinho Kotlin', 'Seletor Qtd', 'Preço Total'],
    xmlLayout: `<com.google.android.material.card.MaterialCardView
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/cartCard"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:layout_margin="16dp"
    app:cardCornerRadius="20dp"
    app:cardElevation="8dp"
    app:strokeWidth="1dp"
    app:strokeColor="#33ffffff">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:padding="20dp">

        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="PRODUTO EM DESTAQUE"
            android:textSize="10sp"
            android:textStyle="bold"
            android:textColor="@color/send_button_tint" />

        <TextView
            android:id="@+id/txtProductName"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="Fone de Ouvido Bluetooth Noise Cancelling"
            android:textColor="@android:color/white"
            android:textStyle="bold"
            android:textSize="16sp"
            android:layout_marginTop="4dp" />

        <TextView
            android:id="@+id/txtProductPrice"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="R$ 299,90"
            android:textColor="#34d399"
            android:textStyle="bold"
            android:textSize="20sp"
            android:layout_marginTop="8dp" />

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical"
            android:layout_marginTop="16dp">

            <TextView
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:text="Quantidade:"
                android:textColor="#94a3b8"
                android:textSize="12sp" />

            <com.google.android.material.button.MaterialButton
                android:id="@+id/btnQtyMinus"
                style="@style/Widget.MaterialComponents.Button.OutlinedButton"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:text="-"
                android:padding="0dp" />

            <TextView
                android:id="@+id/txtQtyValue"
                android:layout_width="32dp"
                android:layout_height="wrap_content"
                android:text="1"
                android:gravity="center"
                android:textColor="@android:color/white"
                android:textStyle="bold"
                android:textSize="14sp" />

            <com.google.android.material.button.MaterialButton
                android:id="@+id/btnQtyPlus"
                style="@style/Widget.MaterialComponents.Button.OutlinedButton"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:text="+"
                android:padding="0dp" />
        </LinearLayout>

        <com.google.android.material.button.MaterialButton
            android:id="@+id/btnAddToCart"
            android:layout_width="match_parent"
            android:layout_height="52dp"
            android:text="ADICIONAR AO CARRINHO (R$ 299,90)"
            android:textStyle="bold"
            app:cornerRadius="16dp"
            android:layout_marginTop="20dp" />

    </LinearLayout>
</com.google.android.material.card.MaterialCardView>`,
    kotlinLogic: `// Lógica Kotlin do Carrinho de Compras
private var itemQuantity = 1
private val unitPrice = 299.90

fun setupEcommerceComponent() {
    val btnMinus = findViewById<com.google.android.material.button.MaterialButton>(R.id.btnQtyMinus)
    val btnPlus = findViewById<com.google.android.material.button.MaterialButton>(R.id.btnQtyPlus)
    val txtQty = findViewById<android.widget.TextView>(R.id.txtQtyValue)
    val btnAdd = findViewById<com.google.android.material.button.MaterialButton>(R.id.btnAddToCart)

    fun updateCartTotal() {
        txtQty?.text = itemQuantity.toString()
        val total = itemQuantity * unitPrice
        val formatted = String.format("R$ %.2f", total)
        btnAdd?.text = "ADICIONAR AO CARRINHO ($formatted)"
    }

    btnMinus?.setOnClickListener {
        if (itemQuantity > 1) {
            itemQuantity--
            updateCartTotal()
        }
    }

    btnPlus?.setOnClickListener {
        itemQuantity++
        updateCartTotal()
    }

    btnAdd?.setOnClickListener {
        val total = itemQuantity * unitPrice
        val formatted = String.format("R$ %.2f", total)
        android.widget.Toast.makeText(this, "$itemQuantity item(ns) adicionado(s). Total: $formatted", android.widget.Toast.LENGTH_LONG).show()
    }
}`,
    uiComponents: [
      { type: 'text', label: 'Produto E-Commerce' },
      { type: 'button', label: 'ADICIONAR AO CARRINHO', action: 'ADD_TO_CART' }
    ]
  },
  {
    id: 'dashboard_screen',
    name: 'Dashboard de Métricas & Desempenho',
    category: 'Painéis & Dashboards',
    description: 'Painel com cartões de estatísticas com indicadores visuais, barras de progresso animadas e botão de atualização em tempo real em Kotlin.',
    icon: '📊',
    previewTags: ['Dashboard', 'ProgressBar', 'Estatísticas', 'Métricas UI'],
    xmlLayout: `<LinearLayout
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    android:id="@+id/dashboardContainer"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:padding="20dp">

    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="MÉTRICAS DA CONTA"
        android:textSize="11sp"
        android:textStyle="bold"
        android:textColor="@color/send_button_tint"
        android:letterSpacing="0.1" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="12dp">

        <com.google.android.material.card.MaterialCardView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginEnd="8dp"
            app:cardCornerRadius="16dp"
            app:cardElevation="4dp">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="vertical"
                android:padding="16dp">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="Vendas Hoje"
                    android:textColor="#94a3b8"
                    android:textSize="11sp" />

                <TextView
                    android:id="@+id/txtRevenueValue"
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="R$ 1.840,00"
                    android:textColor="#34d399"
                    android:textStyle="bold"
                    android:textSize="16sp"
                    android:layout_marginTop="4dp" />
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

        <com.google.android.material.card.MaterialCardView
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:layout_marginStart="8dp"
            app:cardCornerRadius="16dp"
            app:cardElevation="4dp">

            <LinearLayout
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:orientation="vertical"
                android:padding="16dp">

                <TextView
                    android:layout_width="wrap_content"
                    android:layout_height="wrap_content"
                    android:text="Meta Mensal"
                    android:textColor="#94a3b8"
                    android:textSize="11sp" />

                <ProgressBar
                    android:id="@+id/progressGoal"
                    style="?android:attr/progressBarStyleHorizontal"
                    android:layout_width="match_parent"
                    android:layout_height="wrap_content"
                    android:progress="78"
                    android:max="100"
                    android:layout_marginTop="8dp" />
            </LinearLayout>
        </com.google.android.material.card.MaterialCardView>

    </LinearLayout>

    <com.google.android.material.button.MaterialButton
        android:id="@+id/btnRefreshMetrics"
        style="@style/Widget.MaterialComponents.Button.OutlinedButton"
        android:layout_width="match_parent"
        android:layout_height="48dp"
        android:text="⚡ Atualizar Dados em Tempo Real"
        android:textSize="11sp"
        android:layout_marginTop="16dp" />

</LinearLayout>`,
    kotlinLogic: `// Lógica Kotlin de Atualização do Dashboard
fun setupDashboardComponent() {
    val btnRefresh = findViewById<com.google.android.material.button.MaterialButton>(R.id.btnRefreshMetrics)
    val progressBar = findViewById<android.widget.ProgressBar>(R.id.progressGoal)
    val txtRevenue = findViewById<android.widget.TextView>(R.id.txtRevenueValue)

    btnRefresh?.setOnClickListener {
        val randomProgress = (50..98).random()
        val randomRevenue = (1200..3500).random()
        progressBar?.progress = randomProgress
        txtRevenue?.text = String.format("R$ %,d,00", randomRevenue)
        android.widget.Toast.makeText(this, "Métricas atualizadas! Progresso da Meta: $randomProgress%", android.widget.Toast.LENGTH_SHORT).show()
    }
}`,
    uiComponents: [
      { type: 'text', label: 'Painel de Métricas' },
      { type: 'progress', label: 'Progresso da Meta', value: 78 },
      { type: 'button', label: 'Atualizar Dados', action: 'REFRESH_METRICS' }
    ]
  }
];

/**
 * Função responsável por injetar um componente pré-fabricado no código XML e na lógica Kotlin do projeto
 */
export function injectComponentIntoProject(
  config: AppConfig,
  generated: GeneratedCode,
  component: PrefabComponent,
  replaceLayout: boolean = false
): { updatedConfig: AppConfig; updatedGenerated: GeneratedCode } {
  // 1. Atualiza lista de componentes na config
  const updatedComponents = replaceLayout
    ? [...component.uiComponents]
    : [...(config.components || []), ...component.uiComponents];

  const updatedConfig: AppConfig = {
    ...config,
    components: updatedComponents
  };

  // 2. Injeta XML no Layout Principal (activity_main.xml)
  let currentLayout = generated.layout || '';

  if (replaceLayout || !currentLayout.includes('ConstraintLayout')) {
    // Substituição total da tela
    currentLayout = `<?xml version="1.0" encoding="utf-8"?>
<androidx.constraintlayout.widget.ConstraintLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="${config.theme === 'dark' ? "@color/dark_bg" : "@color/light_bg"}"
    tools:context=".MainActivity">

${component.xmlLayout}

</androidx.constraintlayout.widget.ConstraintLayout>`;
  } else {
    // Injeção antes do fechamento do ConstraintLayout
    const closeConstraintTag = '</androidx.constraintlayout.widget.ConstraintLayout>';
    if (currentLayout.includes(closeConstraintTag)) {
      currentLayout = currentLayout.replace(
        closeConstraintTag,
        `\n    <!-- Componente Injetado: ${component.name} -->\n    ${component.xmlLayout}\n\n${closeConstraintTag}`
      );
    } else {
      currentLayout += `\n\n${component.xmlLayout}`;
    }
  }

  // 3. Injeta Lógica Kotlin no MainActivity.kt
  let currentKotlin = generated.mainActivity || '';

  const initCall = `setup${component.id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}()`;

  if (!currentKotlin.includes(initCall)) {
    // Injeta chamada dentro de onCreate se existir
    if (currentKotlin.includes('super.onCreate(savedInstanceState)')) {
      currentKotlin = currentKotlin.replace(
        'super.onCreate(savedInstanceState)',
        `super.onCreate(savedInstanceState)\n        ${initCall}`
      );
    }

    // Injeta a função do componente antes da última chave do MainActivity
    const lastBraceIndex = currentKotlin.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      currentKotlin =
        currentKotlin.substring(0, lastBraceIndex) +
        `\n    ${component.kotlinLogic.replace(/\n/g, '\n    ')}\n}\n`;
    } else {
      currentKotlin += `\n\n${component.kotlinLogic}`;
    }
  }

  const updatedGenerated: GeneratedCode = {
    ...generated,
    layout: currentLayout,
    mainActivity: currentKotlin
  };

  return { updatedConfig, updatedGenerated };
}
